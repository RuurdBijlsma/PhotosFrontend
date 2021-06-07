<template>
    <div class="search" ref="search" @scroll="homeScroll">
        <router-view/>
        <h1 class="search-query" v-if="!isPlace && !loading && allResults.length > 0">‟{{ query }}”</h1>
        <p class="search-glossary" v-if="!loading && allResults.length > 0 && isLabel">{{ glossary }}</p>

        <l-map v-if="isPlace && leaflet.bounds !== null && leaflet.center !== null"
               :style="{height: leaflet.height + 'px'}"
               :zoom="leaflet.zoom"
               ref="map"
               @ready="mapReady"
               class="map-leaflet"
               :center="leaflet.center"
               :options="leaflet.options">
            <l-tile-layer
                :options="leaflet.tileOptions"
                :url="leaflet.url"
                :attribution="leaflet.attribution"
            />
        </l-map>
        <h1 class="search-query search-place" v-if="isPlace && !loading && allResults.length > 0">‟{{ placeName }}”</h1>
        <div :style="{height: leaflet.height + 'px'}" v-else-if="isPlace" class="placeholder-map"></div>

        <div v-if="loading" class="progress-center">
            <v-progress-circular color="primary" :size="$vuetify.breakpoint.width / 4" indeterminate/>
        </div>
        <div v-else-if="allResults.length === 0" class="no-results">
            <div class="no-results-center">
                <v-icon class="icon" x-large>mdi-cloud-search-outline</v-icon>
                <div class="res-caption">No results found for "{{ query }}"</div>
            </div>
        </div>
        <photo-grid v-if="!loading" ref="photoGrid" v-show="highResults.length > 0" :photos="highSlice"/>
        <h2 class="mt-5 mb-5"
            v-if="endIndex >= highResults.length && highResults.length !== 0 && lowResults.length !== 0">
            Less related results
        </h2>
        <photo-grid v-if="!loading" ref="photoGrid" v-show="lowResults.length > 0" :photos="lowSlice"/>
    </div>
</template>

<script lang="ts">
import Vue from 'vue'
import PhotoGrid from "@/components/PhotoGrid.vue";
import {Media} from "@/ts/Media";
import {LMap, LTileLayer, LMarker} from 'vue2-leaflet';
import L, {popup} from "leaflet";
import {api} from "@/ts/constants";

export default Vue.extend({
    name: 'Search',
    components: {PhotoGrid, LMap, LTileLayer, LMarker},
    data: () => ({
        api,
        loading: false,
        endIndex: 100,
        prevScroll: -10000,
        searchElement: {} as HTMLDivElement,
        photoGrid: null as any,
        leaflet: {
            zoom: 12,
            center: null as L.LatLng | null,
            url: 'https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}',
            attributions: 'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
            options: {
                zoomSnap: 0.5,
            },
            tileOptions: {
                id: 'mapbox/streets-v11',
                accessToken: '',
            },
            bounds: null as L.LatLngBounds | null,
            height: 450,
        },
        mapRef: null as any,
        photosInBounds: null as Promise<any> | null,
        // @ts-ignore
        popup: L.popup({maxWidth: 'auto'}),
    }),
    async mounted() {
        this.leaflet.tileOptions.accessToken = this.$store.state.mapboxKey;
        this.photoGrid = this.$refs.photoGrid;
        this.searchElement = this.$refs.search as HTMLDivElement;

        await this.updateSearch();
    },
    methods: {
        async setupMap() {
            let bounds = await this.$store.dispatch('apiRequest', {url: `photos/boundingBox/${this.placeName}`});
            this.photosInBounds = this.$store.dispatch('apiRequest', {
                url: 'photos/photosInBounds', body: {
                    minLat: bounds.minlat,
                    maxLat: bounds.maxlat,
                    minLng: bounds.minlng,
                    maxLng: bounds.maxlng,
                },
            })
            let minCorner = L.latLng(bounds.minlat, bounds.minlng, 0);
            let maxCorner = L.latLng(bounds.maxlat, bounds.maxlng, 0);
            this.leaflet.bounds = L.latLngBounds(minCorner, maxCorner);
            this.leaflet.center = this.leaflet.bounds.getCenter();
            let zoomLevel = this.getBoundsZoomLevel(this.leaflet.bounds, {
                width: this.mapWidth,
                height: this.leaflet.height,
            });
            this.leaflet.zoom = zoomLevel;
        },
        async mapReady() {
            this.mapRef = this.$refs.map;

            let photosInBounds = await this.photosInBounds;
            let isDark = this.$vuetify.theme.dark;
            let color = this.$vuetify.theme.themes[isDark ? 'dark' : 'light'];
            let primary = color.primary as string;
            let secondary = color.secondary as string;
            for (let photo of photosInBounds) {
                let marker = L.circleMarker(
                    [photo.MediaLocation.latitude, photo.MediaLocation.longitude],
                    {
                        radius: 10,
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
                        `<img height="${mediaHeight}" width="${mediaHeight * ratio}" src="${api}/photos/tiny/${photo.id}.webp" alt="Image at ${e.latlng.lat}, ${e.latlng.lng}">` :
                        `<video height="${mediaHeight}" width="${mediaHeight * ratio}" src="${api}/photos/webm/${photo.id}.webm" autoplay controls loop>`;
                    this.popup
                        .setLatLng(e.latlng)
                        .setContent(`<a href="${location.pathname}#/photo/${photo.id}">${content}</a>`)
                        .openOn(this.mapRef.mapObject);
                });
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
        async updateSearch() {
            this.leaflet.center = null;
            this.loading = true;
            await this.$store.dispatch('search', this.query);
            if (this.isPlace)
                await this.setupMap();
            this.loading = false;
        },
        async homeScroll() {
            let scrollTop = this.searchElement.scrollTop;
            // If we haven't scrolled more than 180px since last scroll fire just return
            if (Math.abs(this.prevScroll - scrollTop) < 180)
                return;
            this.prevScroll = scrollTop;

            let scrollBottom = this.searchElement.scrollHeight - scrollTop - this.searchElement.clientHeight;
            if (scrollBottom < 3000 && this.endIndex < this.allResults.length)
                this.endIndex += 100;
        },
    },
    computed: {
        mapWidth(): number {
            return this.$vuetify.breakpoint.width - this.$vuetify.application.left - this.$vuetify.application.right;
        },
        query(): string {
            return this.$route.params.query;
        },
        highSlice(): Media[] {
            return this.highResults.slice(0, this.endIndex);
        },
        lowSlice(): Media[] {
            return this.lowResults.slice(0, this.endIndex - this.lowResults.length);
        },
        highResults(): Media[] {
            return this.$store.state.searchResults.high;
        },
        lowResults(): Media[] {
            return this.$store.state.searchResults.low;
        },
        allResults(): Media[] {
            return this.highResults.concat(this.lowResults);
        },
        isLabel(): boolean {
            return this.$store.state.searchResults.searchType === 'label';
        },
        isPlace(): boolean {
            return this.$store.state.searchResults.searchType === 'place';
        },
        placeName(): string {
            return this.$store.state.searchResults.placeName;
        },
        glossary(): boolean {
            return this.$store.state.searchResults.glossary;
        },
    },
    watch: {
        query() {
            this.updateSearch();
        },
        allResults() {
            this.$store.commit('viewerQueue', this.allResults);
        },
        '$store.state.keepInView'() {
            if (this.$store.state.keepInView !== null)
                this.photoGrid.scrollMediaIntoView(this.$store.state.keepInView);
        },
    }
})
</script>

<style scoped>
.search {
    padding: 10px 10px 10px 10px;
    max-height: calc(100vh - 64px);
    overflow-y: scroll;
    width: 100%;
    height: 100%;
}

.search-query {
    text-align: center;
    font-style: italic;
    margin-top: 20px;
    margin-bottom: 15px;
    font-weight: 400;
}

.search-place {
    margin-top: 25px;
    margin-bottom: 5px;
}

.search-glossary {
    text-align: center;
    min-width: 40%;
    width: 700px;
    max-width: 100%;
    margin: 0 auto;
}

.map-leaflet, .placeholder-map {
    width: calc(100% + 20px);
    margin-left: -10px;
    margin-right: -10px;
    margin-top: -10px;
    z-index: 3;
}

.progress-center {
    display: flex;
    height: calc(70vh - 64px);
    width: 100%;
    padding: 20px;
    align-items: center;
    justify-content: center;
}

.no-results {
    display: flex;
    width: 100%;
    height: 70%;
    place-content: center;
    flex-direction: column;
    text-align: center;
}

.no-results .icon {
    font-size: 40vh !important;
    opacity: 0.3;
}

.no-results .res-caption {
    font-size: 3vh !important;
    opacity: 0.8;
}

</style>
