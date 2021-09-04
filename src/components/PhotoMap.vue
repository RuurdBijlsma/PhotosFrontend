<template>
    <l-map
        v-if="leaflet.center && leaflet.zoom"
        :zoom="leaflet.zoom"
        ref="map"
        :center="leaflet.center"
        :options="leaflet.options"
        @update:bounds="mapPanned"
        @ready="addMarkers">
        <l-tile-layer
            :options="leaflet.tileOptions"
            :url="leaflet.url"
            :attribution="leaflet.attribution"
        />
        <l-rectangle v-if="startBounds !== null"
                     :bounds="startBounds"
                     color="red"
                     fill-color="red"
                     :weight="leaflet.zoom / 6"
                     :fill-opacity="0.01"/>
    </l-map>
</template>

<script lang="ts">
import Vue from 'vue'
import {LMap, LMarker, LTileLayer, LRectangle} from 'vue2-leaflet';
import L from "leaflet";
import {api} from "@/ts/constants";
import historyMode from "../env/historyMode"

export default Vue.extend({
    name: 'PhotoMap',
    components: {LMap, LTileLayer, LMarker, LRectangle},
    props: {
        width: {type: Number, required: true},
        height: {type: Number, required: true},
        startBounds: {type: L.LatLngBounds},
        startDate: {type: Date},
        endDate: {type: Date},
    },
    data: () => ({
        dateChangeUpdate: -1,
        photosInBounds: null as Promise<any> | null,
        mapRef: null as any,
        // @ts-ignore
        popup: L.popup({maxWidth: 'auto'}),
        leaflet: {
            zoom: 12,
            center: null as L.LatLng | null,
            url: 'https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}',
            attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
            options: {
                zoomSnap: 0.5,
            },
            tileOptions: {
                id: 'mapbox/streets-v11',
                accessToken: '',
                tileSize: 512,
                zoomOffset: -1,
            },
            bounds: null as L.LatLngBounds | null,
            markers: [] as L.CircleMarker[],
        },
        panTimeout: -1,
    }),
    async mounted() {
        this.leaflet.tileOptions.id = this.$vuetify.theme.dark ? 'mapbox/dark-v10' : 'mapbox/streets-v11';
        this.leaflet.tileOptions.accessToken = this.$store.state.mapboxKey;
        if (this.startBounds) {
            this.leaflet.bounds = this.startBounds;
        } else {
            let bounds = await this.$store.dispatch('apiRequest', {url: 'photos/totalBounds'});
            let minCorner = L.latLng(bounds.minlat, bounds.minlng, 0);
            let maxCorner = L.latLng(bounds.maxlat, bounds.maxlng, 0);
            this.leaflet.bounds = L.latLngBounds(minCorner, maxCorner).pad(0.05);
        }
        if (this.leaflet.bounds) {
            this.leaflet.center = this.leaflet.bounds.getCenter();
            this.leaflet.zoom = this.getBoundsZoomLevel(this.leaflet.bounds, {
                width: this.width,
                height: this.height,
            });
            this.photosInBounds = this.updateFromBounds();
        }
    },
    methods: {
        mapPanned(b: L.LatLngBounds) {
            clearTimeout(this.panTimeout);
            this.panTimeout = setTimeout(async () => {
                this.leaflet.bounds = b;
                this.photosInBounds = this.updateFromBounds();
                await this.addMarkers();
            }, 200);
        },
        async updateFromBounds() {
            if (!this.leaflet.bounds) return;
            return this.$store.dispatch('apiRequest', {
                url: 'photos/photosInBounds', body: {
                    minLat: this.leaflet.bounds.getSouth(),
                    maxLat: this.leaflet.bounds.getNorth(),
                    minLng: this.leaflet.bounds.getWest(),
                    maxLng: this.leaflet.bounds.getEast(),
                    startDate: this.startDate,
                    endDate: this.endDate,
                },
            });
        },
        async addMarkers() {
            this.mapRef = this.$refs.map;

            let photosInBounds = await this.photosInBounds;
            let isDark = this.$vuetify.theme.dark;
            let color = this.$vuetify.theme.themes[isDark ? 'dark' : 'light'];
            let primary = color.primary as string;
            let secondary = color.secondary as string;

            this.leaflet.markers.forEach(m => m.remove());
            this.leaflet.markers = [];
            console.log('zoom', this.leaflet.zoom);
            for (let photo of photosInBounds) {
                let marker = L.circleMarker(
                    [photo.Location.latitude, photo.Location.longitude],
                    {
                        radius: 8,
                        color: photo.type === 'image' ? primary : secondary,
                        opacity: 0.6,
                        weight: 2,
                        fillColor: photo.type === 'image' ? primary : secondary,
                        fillOpacity: 0.2,
                    }
                );
                let ratio = photo.width / photo.height;
                const mediaHeight = 200;
                marker.addTo(this.mapRef.mapObject);
                marker.on('click', (e: any) => {
                    const content = photo.type === 'image' ?
                        `<img height="${mediaHeight}" width="${mediaHeight * ratio}" src="${api}/photo/tiny/${photo.id}.webp" alt="Image at ${e.latlng.lat}, ${e.latlng.lng}">` :
                        `<video height="${mediaHeight}" width="${mediaHeight * ratio}" src="${api}/photo/webm/${photo.id}.webm" autoplay controls loop>`;
                    this.popup
                        .setLatLng(e.latlng)
                        .setContent(`<a href="${historyMode ? '' : '#'}/photo/${photo.id}">${content}</a>`)
                        .openOn(this.mapRef.mapObject);
                });
                this.leaflet.markers.push(marker);
            }
        },
        getBoundsZoomLevel: function (bounds: L.LatLngBounds, mapDim: { width: number, height: number }) {
            const WORLD_DIM = {height: 256, width: 256};
            const ZOOM_MAX = 21;

            const latRad = (lat: number) => {
                const sin = Math.sin(lat * Math.PI / 180);
                const radX2 = Math.log((1 + sin) / (1 - sin)) / 2;
                return Math.max(Math.min(radX2, Math.PI), -Math.PI) / 2;
            }

            const zoom = (mapPx: number, worldPx: number, fraction: number) =>
                Math.floor(Math.log(mapPx / worldPx / fraction) / Math.LN2)

            const ne = bounds.getNorthEast();
            const sw = bounds.getSouthWest();

            const latFraction = (latRad(ne.lat) - latRad(sw.lat)) / Math.PI;

            const lngDiff = ne.lng - sw.lng;
            const lngFraction = ((lngDiff < 0) ? (lngDiff + 360) : lngDiff) / 360;

            const latZoom = zoom(mapDim.height, WORLD_DIM.height, latFraction);
            const lngZoom = zoom(mapDim.width, WORLD_DIM.width, lngFraction);

            return Math.min(latZoom, lngZoom, ZOOM_MAX);
        },
    },
    computed: {},
    watch: {
        startDate() {
            clearTimeout(this.dateChangeUpdate);
            this.dateChangeUpdate = setTimeout(async () => {
                this.photosInBounds = this.updateFromBounds();
                await this.addMarkers();
            }, 150);
        },
        endDate() {
            clearTimeout(this.dateChangeUpdate);
            this.dateChangeUpdate = setTimeout(async () => {
                this.photosInBounds = this.updateFromBounds();
                await this.addMarkers();
            }, 150);
        },
    },
})
</script>

<style scoped>

</style>
