<template>
    <div class="media-photo" :style="{
        flexDirection: $vuetify.breakpoint.mobile ? 'column' : 'row',
    }">
        <router-view/>
        <div class="left-pane" :style="{
            width: ($vuetify.breakpoint.mobile || !showInfo) ? '100%' : `calc(100% - ${infoPaneSize}px)`,
            minHeight: $vuetify.breakpoint.mobile ? '100vh' : null,
        }">
            <div class="top-gradient" :style="{
                transform: showPhotoButtons ? 'translateY(0)' : 'translateY(-150px)',
            }"/>
            <photo-gallery ref="photoGallery" :queue="queue" class="photo-gallery"/>
            <v-btn icon dark @click="close" class="back-button btn"
                   v-if="$store.getters.isLoggedIn || loggedOffUI" :style="{
                transform: showPhotoButtons ? 'translateY(0)' : 'translateY(-150px)',
            }">
                <v-icon>mdi-arrow-left</v-icon>
            </v-btn>
            <div class="top-right-buttons btn" :style="{
                transform: showPhotoButtons ? 'translateY(0)' : 'translateY(-150px)',
            }">
                <v-btn v-if="isSelecting && !selected" icon dark @click="addToSelection" title="Add to selection">
                    <v-icon>mdi-circle-outline</v-icon>
                </v-btn>
                <v-btn v-if="isSelecting && selected" icon dark @click="removeFromSelection"
                       title="Remove from selection">
                    <v-icon>mdi-check-circle</v-icon>
                </v-btn>
                <v-btn
                    v-if="!$vuetify.breakpoint.mobile && $store.getters.isLoggedIn && media && media.type === 'photo'"
                    icon
                    title="Edit image"
                    dark :to="$route.path + '/edit'">
                    <v-icon>mdi-image-edit-outline</v-icon>
                </v-btn>
                <v-btn icon dark @click="shareMedia" title="Share" :loading="shareLoading"
                       v-if="!$vuetify.breakpoint.mobile">
                    <v-icon>mdi-share-variant-outline</v-icon>
                </v-btn>
                <v-btn v-if="!$vuetify.breakpoint.mobile" icon dark
                       @click="showInfo = !showInfo" title="Show information">
                    <v-icon>mdi-information-outline</v-icon>
                </v-btn>
                <v-menu :close-on-content-click="!$store.getters.isLoggedIn"
                        v-model="showPhotoMenu"
                        :nudge-left="$store.getters.isLoggedIn ? 180 : 110"
                        min-width="auto">
                    <template v-slot:activator="{ on, attrs }">
                        <v-btn dark icon v-bind="attrs" v-on="on">
                            <v-icon>mdi-dots-vertical</v-icon>
                        </v-btn>
                    </template>
                    <v-list dense>
                        <v-list-item @click="reprocess(media)" v-if="$store.getters.isLoggedIn">
                            <v-list-item-avatar>
                                <v-progress-circular :size="25" :width="2" indeterminate v-if="reprocessLoading"/>
                                <v-icon v-else>mdi-auto-fix</v-icon>
                            </v-list-item-avatar>
                            <v-list-item-content>
                                <v-list-item-title>
                                    Reprocess item
                                </v-list-item-title>
                            </v-list-item-content>
                        </v-list-item>
                        <v-list-item @click="fixDateFromFile()" v-if="$store.getters.isLoggedIn">
                            <v-list-item-avatar>
                                <v-progress-circular :size="25" :width="2" indeterminate v-if="fixDateLoading"/>
                                <v-icon v-else>mdi-calendar-range</v-icon>
                            </v-list-item-avatar>
                            <v-list-item-content>
                                <v-list-item-title>
                                    Fix date from filename
                                </v-list-item-title>
                            </v-list-item-content>
                        </v-list-item>
                        <v-list-item @click="deleteItem()" v-if="$store.getters.isLoggedIn">
                            <v-list-item-avatar>
                                <v-progress-circular :size="25" :width="2" indeterminate v-if="deleteLoading"/>
                                <v-icon v-else>mdi-delete-outline</v-icon>
                            </v-list-item-avatar>
                            <v-list-item-content>
                                <v-list-item-title>
                                    Delete
                                </v-list-item-title>
                            </v-list-item-content>
                        </v-list-item>
                        <v-list-item @click="downloadItem()">
                            <v-list-item-avatar>
                                <v-progress-circular :size="25" :width="2" indeterminate v-if="downloadLoading"/>
                                <v-icon v-else>mdi-download</v-icon>
                            </v-list-item-avatar>
                            <v-list-item-content>
                                <v-list-item-title>
                                    Download
                                </v-list-item-title>
                            </v-list-item-content>
                        </v-list-item>
                    </v-list>
                </v-menu>
            </div>
            <div class="prev-button-container skip-button-container"
                 @click="previous"
                 v-if="photoGallery && !isTouch && canSkipLeft && !photoGallery.imgZoomed">
                <v-btn fab dark
                       class="prev-button btn">
                    <v-icon>mdi-chevron-left</v-icon>
                </v-btn>
            </div>
            <div class="next-button-container skip-button-container"
                 @click="next"
                 v-if="photoGallery && !isTouch && canSkipRight && !photoGallery.imgZoomed">
                <v-btn fab dark
                       class="next-button btn">
                    <v-icon>mdi-chevron-right</v-icon>
                </v-btn>
            </div>
            <div class="bottom-buttons btn" v-if="$vuetify.breakpoint.mobile" :style="{
                transform: showPhotoButtons ? 'translateY(0)' : 'translateY(150px)',
            }">

                <v-menu>
                    <template v-slot:activator="{ on, attrs }">
                        <v-btn v-bind="attrs" v-on="on" icon dark
                               title="Share"
                               :loading="shareLoading">
                            <v-icon>mdi-share-variant-outline</v-icon>
                        </v-btn>
                    </template>
                    <v-list>
                        <v-list-item @click="shareLink">
                            <v-list-item-icon>
                                <v-icon>mdi-link</v-icon>
                            </v-list-item-icon>
                            <v-list-item-title>Share link</v-list-item-title>
                        </v-list-item>
                        <v-list-item @click="shareMedia">
                            <v-list-item-icon>
                                <v-icon>mdi-image-outline</v-icon>
                            </v-list-item-icon>
                            <v-list-item-title v-if="media">Share {{ media.type }}</v-list-item-title>
                        </v-list-item>
                    </v-list>
                </v-menu>
                <v-btn v-if="$store.getters.isLoggedIn && media && media.type === 'photo'"
                       icon title="Edit image"
                       dark :to="$route.path + '/edit'">
                    <v-icon>mdi-image-edit-outline</v-icon>
                </v-btn>
                <v-btn icon dark @click="showInfo = !showInfo" title="Show information">
                    <v-icon>mdi-information-outline</v-icon>
                </v-btn>
            </div>
        </div>
        <v-sheet class="right-pane" :style="{
            top: $vuetify.breakpoint.mobile ? '100%' : null,
            transform: $vuetify.breakpoint.mobile ?
                (showInfo ? `translateY(-100%)` : `translateY(0%)`) :
                (showInfo ? `translateX(0px)` : `translateX(${infoPaneSize}px)`),
            width: $vuetify.breakpoint.mobile ? '100%' : `${infoPaneSize}px`,
        }" :key="loadInfo">
            <div v-ripple class="mobile-header" @click="showInfo = false" v-if="$vuetify.breakpoint.mobile">
                <v-icon>mdi-chevron-down</v-icon>
            </div>
            <div class="info-header" v-else>
                <v-btn @click="showInfo = false" icon>
                    <v-icon>mdi-close</v-icon>
                </v-btn>
                <span class="ml-3">Info</span>
            </div>
            <v-list class="info-content" v-if="media" subheader>
                <template v-if="media.albums.length > 0">
                    <v-subheader>Albums</v-subheader>
                    <v-list-item two-line v-for="album in media.albums" :key="album.id" :to="`/album/${album.id}`">
                        <v-list-item-avatar>
                            <v-img :src="`${api}/photo/tiny/${album.cover}.webp`"/>
                        </v-list-item-avatar>
                        <v-list-item-content>
                            <v-list-item-title>{{ album.name }}</v-list-item-title>
                            <v-list-item-subtitle>{{ album.count }} items</v-list-item-subtitle>
                        </v-list-item-content>
                    </v-list-item>
                </template>
                <v-subheader>Details</v-subheader>
                <v-list-item two-line>
                    <v-list-item-avatar>
                        <v-icon>mdi-calendar</v-icon>
                    </v-list-item-avatar>
                    <v-list-item-content>
                        <v-list-item-title>
                            <v-menu
                                :close-on-content-click="false"
                                transition="scale-transition"
                                offset-y
                                v-model="dateMenu"
                                :nudge-left="50"
                                min-width="auto">
                                <template v-slot:activator="{ on, attrs }">
                                    <span class="mr-4" v-bind="attrs" v-on="on">{{ formattedCreateDate }}</span>
                                </template>
                                <v-card>
                                    <v-date-picker
                                        :readonly="!$store.getters.isLoggedIn"
                                        class="roboto"
                                        max-width="360"
                                        v-model="createDate"
                                        :max="new Date().toISOString().substr(0, 10)"
                                        min="1950-01-01"/>
                                    <v-card-actions v-if="$store.getters.isLoggedIn">
                                        <v-spacer/>
                                        <v-btn text @click="dateMenu=false">Cancel</v-btn>
                                        <v-btn color="primary" text
                                               :loading="dateLoading"
                                               @click="saveEditedDate">
                                            Save
                                        </v-btn>
                                    </v-card-actions>
                                </v-card>
                            </v-menu>
                        </v-list-item-title>
                        <v-list-item-subtitle>
                            <v-menu
                                :close-on-content-click="false"
                                transition="scale-transition"
                                offset-y
                                v-model="timeMenu"
                                :nudge-left="50"
                                min-width="auto">
                                <template v-slot:activator="{ on, attrs }">
                                    <span v-bind="attrs" v-on="on">{{ formattedCreateTime }}</span>
                                </template>
                                <v-card>
                                    <v-time-picker
                                        :readonly="!$store.getters.isLoggedIn"
                                        class="roboto"
                                        format="24hr"
                                        use-seconds
                                        scrollable
                                        v-model="createTime"
                                        max-width="360"/>
                                    <v-card-title class="error--text" v-if="dateError && $store.getters.isLoggedIn">
                                        {{ dateError }}
                                    </v-card-title>
                                    <v-card-actions v-if="$store.getters.isLoggedIn">
                                        <v-spacer/>
                                        <v-btn text @click="timeMenu=false">Cancel</v-btn>
                                        <v-btn color="primary" text
                                               :loading="dateLoading"
                                               @click="saveEditedDate">
                                            Save
                                        </v-btn>
                                    </v-card-actions>
                                </v-card>
                            </v-menu>
                        </v-list-item-subtitle>
                    </v-list-item-content>
                </v-list-item>
                <v-list-item two-line v-if="media.filename">
                    <v-list-item-avatar>
                        <v-icon>mdi-image-outline</v-icon>
                    </v-list-item-avatar>
                    <v-list-item-content>
                        <v-list-item-title :title="media.filename">
                            {{ media.filename }}
                        </v-list-item-title>
                        <v-list-item-subtitle>
                            <div class="photo-info">
                                <span v-if="media.type === 'photo'">{{ megaPixels }}MP</span>
                                <span v-else>{{ toHms(media.duration / 1000) }}</span>
                                <span class="ml-2 mr-2">•</span>
                                <span>{{ media.width }}×{{ media.height }}</span>
                                <span class="ml-2 mr-2">•</span>
                                <span>{{ readableBytes }}</span>
                            </div>
                            <div v-if="media.type==='video' && avgFps !== null" class="video-info"
                                 title="Frames per second">
                                <template v-if="originalFps && originalFps / avgFps > 1.9">
                                    <v-icon small class="mr-2">mdi-motion-play-outline</v-icon>
                                    <span>{{ originalFps }}fps</span>
                                    <span class="ml-1 mr-1"> → </span>
                                </template>
                                <span class="mr-4">{{ avgFps }}fps</span>
                            </div>
                        </v-list-item-subtitle>
                    </v-list-item-content>
                </v-list-item>
                <v-list-item two-line v-if="media.exif.Make && media.exif.Model">
                    <v-list-item-avatar>
                        <v-icon>mdi-camera-outline</v-icon>
                    </v-list-item-avatar>
                    <v-list-item-content>
                        <v-list-item-title>
                            {{ media.exif.Make }} {{ media.exif.Model }}
                        </v-list-item-title>
                        <v-list-item-subtitle>
                            <span class="mr-3" v-if="media.exif.FNumber">ƒ/{{ media.exif.FNumber }}</span>
                            <span class="mr-3" v-if="media.exif.FocalLength">{{ media.exif.FocalLength }}mm</span>
                            <span class="mr-3" v-if="exposureTime">{{ exposureTime }}</span>
                            <span v-if="media.exif.ISO">ISO{{ media.exif.ISO }}</span>
                        </v-list-item-subtitle>
                    </v-list-item-content>
                </v-list-item>
                <v-menu
                    :close-on-content-click="false"
                    transition="scale-transition"
                    min-width="auto">
                    <template v-slot:activator="{ on, attrs }">
                        <v-list-item v-bind="$store.getters.isLoggedIn ? attrs : {}"
                                     v-on="$store.getters.isLoggedIn ? on : {}"
                                     two-line v-if="classifications && classifications.length > 0">
                            <v-list-item-avatar>
                                <v-icon>mdi-eye-outline</v-icon>
                            </v-list-item-avatar>
                            <v-list-item-content>
                                <v-list-item-title :title="classifications[0].labels">
                                    {{ classifications[0].labels }}
                                </v-list-item-title>
                                <v-list-item-subtitle :title="classifications[0].glossary">
                                    {{ classifications[0].glossary }}
                                </v-list-item-subtitle>
                            </v-list-item-content>
                        </v-list-item>
                    </template>
                    <v-list max-width="360">
                        <v-list-item two-line v-for="(classification, i) in classifications" :key="i"
                                     :to="classification.firstLabel ? `/search/${classification.firstLabel}` : null">
                            <v-list-item-avatar>
                                <v-icon>mdi-alpha-{{ 'abcdefg'[i] }}-circle-outline</v-icon>
                            </v-list-item-avatar>
                            <v-list-item-content>
                                <v-list-item-title :title="classification.labels">
                                    {{ classification.labels }}
                                </v-list-item-title>
                                <v-list-item-subtitle :title="classification.glossary">
                                    {{ classification.glossary }}
                                </v-list-item-subtitle>
                            </v-list-item-content>
                        </v-list-item>
                    </v-list>
                </v-menu>
                <a v-if="leaflet.tileOptions.accessToken === '' && coordinate"
                   class="no-style"
                   target="_blank"
                   :href="`https://www.google.com/maps/place/${coordinate.lat},${coordinate.lng}`">
                    <v-list-item two-line @click="0">
                        <v-list-item-avatar>
                            <v-icon>mdi-open-in-new</v-icon>
                        </v-list-item-avatar>
                        <v-list-item-content>
                            <v-list-item-title v-if="place">
                                {{ place }}
                            </v-list-item-title>
                            <v-list-item-subtitle :title="subPlace">
                                <span>{{ subPlace }}</span>
                            </v-list-item-subtitle>
                        </v-list-item-content>
                    </v-list-item>
                </a>
                <v-list-item two-line v-else-if="media.location" :to="`/search/${place}`">
                    <v-list-item-avatar>
                        <v-icon>mdi-map-marker-outline</v-icon>
                    </v-list-item-avatar>
                    <v-list-item-content>
                        <v-list-item-title v-if="place">
                            {{ place }}
                        </v-list-item-title>
                        <v-list-item-subtitle :title="subPlace">
                            <span>{{ subPlace }}</span>
                        </v-list-item-subtitle>
                    </v-list-item-content>
                </v-list-item>
            </v-list>

            <l-map
                v-if="coordinate && leaflet.zoom && leaflet.tileOptions.accessToken !== ''"
                class="location-map mt-5"
                :zoom="leaflet.zoom"
                ref="map"
                :center="coordinate"
                :options="leaflet.options">
                <l-tile-layer
                    :options="leaflet.tileOptions"
                    :url="leaflet.url"
                    :attribution="leaflet.attribution"/>
                <l-marker
                    v-if="gpsIcon"
                    :lat-lng="coordinate"
                    :icon="gpsIcon"/>
            </l-map>
        </v-sheet>
    </div>
</template>

<script lang="ts">
import Vue from 'vue'
import {api, defaultApi} from "@/ts/constants"
import {Location, Media} from "@/ts/Media";
import {bytesToReadable, downloadFromUrl, filenameToDate, isTouchDevice, secondsToHms} from "@/ts/utils";
import {format, parseISO} from 'date-fns'
import {LMap, LMarker, LTileLayer} from "vue2-leaflet";
import L from "leaflet";
import PhotoGallery from "@/components/PhotoGallery.vue";


export default Vue.extend({
    name: 'Photo',
    components: {PhotoGallery, LMap, LTileLayer, LMarker},
    props: {},
    data: () => ({
        isTouch: isTouchDevice(),
        videoPlaying: false,
        dateMenu: false,
        timeMenu: false,
        editingDate: new Date(),
        dateLoading: false,
        dateError: '',
        api,
        media: null as Media | null,
        isLoading: new Set(),
        loadInfo: 0,
        infoPaneSize: 400,
        reprocessLoading: false,
        deleteLoading: false,
        fixDateLoading: false,
        downloadLoading: false,
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
        gpsIcon: null as L.Icon | null,
        photoGallery: null as any,
        showPhotoMenu: false,
        shareLoading: false,
        loggedOffUI: false,
    }),
    async mounted() {
        console.log(this.id);

        this.photoGallery = this.$refs.photoGallery;
        this.loggedOffUI = !this.$store.getters.isLoggedIn && this.$route.name === 'ViewPhoto';
        console.log('loggedoffui', this.loggedOffUI)

        if (!this.loggedOffUI) {
            this.leaflet.tileOptions.id = this.$vuetify.theme.dark ? 'mapbox/dark-v10' : 'mapbox/streets-v11';
            this.leaflet.tileOptions.accessToken = this.$store.state.mapboxKey;
            this.loadGpsIcon().then();
        }

        this.media = this.queue.find(i => i.id === this.id) ?? null;
        await this.fullMediaLoad();
        if (this.loggedOffUI) {
            this.$store.commit('viewerQueue', [this.media]);
        }
    },
    methods: {
        async shareLink() {
            const url = location.origin + '/view/' + this.id + ((defaultApi === api) ? '' : ('?api=' + api));
            if (isTouchDevice()) {
                await navigator.share({
                    url,
                });
            } else {
                await navigator.clipboard.writeText(url);
                await this.$store.dispatch('addSnack', {text: 'Share URL copied to clipboard!'});
            }
        },
        async shareMedia() {
            if (!isTouchDevice()) {
                return await this.shareLink();
            }

            this.shareLoading = true;
            try {
                let mbs = (this.media?.size ?? 0) / 1024 / 1024;
                let type = this.media?.type ?? 'photo';
                const url = type === 'video' ? `${api}/photo/webm/${this.id}.webm` : `${api}/photos/full/${this.id}`;
                let filename = type === 'video' ?
                    ((this.media?.filename ?? 'video') + '.webm') :
                    (this.media?.filename ?? 'photo.jpg');
                let mimeType = type === 'video' ? 'video/webm' : 'image/jpeg';
                if (mbs < 50) {
                    // Download media and share that
                    await fetch(url)
                        .then(response => response.blob())
                        .then(async blob => {
                            const file = new File(
                                [blob],
                                filename,
                                {type: mimeType},
                            );
                            const filesArray = [file];
                            //@ts-ignore
                            if (navigator.canShare && navigator.canShare({files: filesArray})) {
                                console.log('sharing', filesArray)
                                await navigator.share({
                                    title: this.media?.filename ?? 'Media',
                                    text: this.media?.filename ?? 'Media',
                                    //@ts-ignore
                                    files: filesArray,
                                });
                            } else {
                                await navigator.share({
                                    title: this.media?.filename ?? 'Media',
                                    text: this.media?.filename ?? 'Media',
                                    //@ts-ignore
                                    url,
                                });
                            }
                        });
                } else {
                    await navigator.share({
                        title: this.media?.filename ?? 'Media',
                        text: this.media?.filename ?? 'Media',
                        //@ts-ignore
                        url,
                    });
                }
            } catch (e) {
                if (e.message === 'Share canceled')
                    return;
                console.warn("Cant share", e);
                await this.$store.dispatch('addSnack', {text: `Can't share, ${e.message}`})
            }
            this.shareLoading = false;
        },
        addToSelection() {
            if (this.media === null) return;
            this.$store.commit('addToPhotoSelection', this.media);
            this.$store.commit('lastSelectedPhoto', this.media);
        },
        removeFromSelection() {
            if (this.media === null) return;
            this.$store.commit('removeFromPhotoSelection', this.media);
            if (this.$store.state.lastSelectedPhoto?.id === this.media.id) {
                let newLastSelected = this.$store.getters.selectedMedias[this.$store.getters.selectedMedias.length - 1] ?? null;
                this.$store.commit('lastSelectedPhoto', newLastSelected);
            }
        },
        async downloadItem() {
            this.downloadLoading = true;
            await downloadFromUrl(`${api}/photos/full/${this.id}`, this.media?.filename ?? 'image.jpg');
            this.showPhotoMenu = false;
            this.downloadLoading = false;
        },
        async loadGpsIcon() {
            if (this.media === null || this.media.location === null)
                return null;
            let canvas = document.createElement('canvas');
            let context = canvas.getContext('2d');
            const size = 42;
            const triangleSize = 8;
            const strokeWidth = 3;
            canvas.width = size;
            // + 10 for the triangle pointer below
            canvas.height = size + triangleSize;

            let image = new Image();
            image.src = `${api}/photo/tiny/${this.media.id}.webp`;
            image.crossOrigin = 'Anonymous'
            image.onload = () => {
                if (context === null) return;
                // const color = this.$vuetify.theme.themes[this.$vuetify.theme.dark ? 'dark' : 'light'].primary as string;
                const color = 'black'
                context.fillStyle = color;
                context.strokeStyle = color;

                // Triangle pointer
                context.beginPath();
                context.moveTo(0, (size + triangleSize) / 2);
                context.lineTo(size, (size + triangleSize) / 2);
                context.lineTo(size / 2, size + triangleSize);
                context.fill();

                // Circular image with stroke
                context.save();
                context.beginPath();
                context.arc(size / 2, size / 2, size / 2 - strokeWidth / 2, 0, Math.PI * 2, false);
                context.lineWidth = strokeWidth;
                context.stroke();
                context.clip();
                this.drawImageProp(context, image, 0, 0, size, size);
                context.restore();

                // [...document.querySelectorAll('.test-canvas')].forEach(c => c.remove());
                // canvas.setAttribute('class', 'test-canvas');
                // document.body.appendChild(canvas);

                const url = canvas.toDataURL();
                this.gpsIcon = L.icon({
                    iconUrl: url,
                    iconSize: [size, size + 10],
                    iconAnchor: [size / 2, size]
                });
            }
        },
        /**
         * By Ken Fyrstenberg Nilsen
         *
         * drawImageProp(context, image [, x, y, width, height [,offsetX, offsetY]])
         *
         * If image and context are only arguments rectangle will equal canvas
         */
        drawImageProp(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number, offsetX: number | null = null, offsetY: number | null = null) {
            if (arguments.length === 2) {
                x = y = 0;
                w = ctx.canvas.width;
                h = ctx.canvas.height;
            }

            // default offset is center
            offsetX = typeof offsetX === "number" ? offsetX : 0.5;
            offsetY = typeof offsetY === "number" ? offsetY : 0.5;

            // keep bounds [0.0, 1.0]
            if (offsetX < 0) offsetX = 0;
            if (offsetY < 0) offsetY = 0;
            if (offsetX > 1) offsetX = 1;
            if (offsetY > 1) offsetY = 1;

            const iw = img.width,
                ih = img.height,
                r = Math.min(w / iw, h / ih);
            let nw = iw * r,   // new prop. width
                nh = ih * r,   // new prop. height
                cx, cy, cw, ch, ar = 1;

            // decide which gap to fill
            if (nw < w) ar = w / nw;
            if (Math.abs(ar - 1) < 1e-14 && nh < h) ar = h / nh;  // updated
            nw *= ar;
            nh *= ar;

            // calc source rectangle
            cw = iw / (nw / w);
            ch = ih / (nh / h);

            cx = (iw - cw) * offsetX;
            cy = (ih - ch) * offsetY;

            // make sure source rectangle is valid
            if (cx < 0) cx = 0;
            if (cy < 0) cy = 0;
            if (cw > iw) cw = iw;
            if (ch > ih) ch = ih;

            // fill image in dest. rectangle
            ctx.drawImage(img, cx, cy, cw, ch, x, y, w, h);
        },
        async fixDateFromFile() {
            if (this.media === null) return;
            let filename = this.media.filename;
            if (filename === null) return;
            let newDate = filenameToDate(filename);
            if (newDate === null) {
                this.$store.dispatch('addSnack', {text: "Couldn't retrieve date from filename"}).then();
                return;
            }
            this.fixDateLoading = true;
            let accepted = await this.$store.dispatch('showPrompt', {
                title: `Is this date correct?`,
                subtitle: `
                    <p><b>Filename: </b>${filename}</p>
                    <div><b>New date: </b>${format(newDate, 'yyyy-MM-dd HH:mm:ss')}</div>
                `,
            });
            if (!accepted) {
                this.fixDateLoading = false;
                return;
            }
            await this.changeDate(newDate);
            this.showPhotoMenu = false;
            this.fixDateLoading = false;
        },
        async deleteItem() {
            if (this.media === null) return;
            this.deleteLoading = true;
            let accepted = await this.$store.dispatch('showPrompt', {
                title: `Are you sure you want to delete this ${this.media.type}`,
                subtitle: `This cannot be undone.`,
                confirmText: 'Delete',
            });
            if (!accepted) {
                this.showPhotoMenu = false;
                this.deleteLoading = false;
                return;
            }
            let success = await this.$store.dispatch('apiRequest', {
                url: `photos/deleteItem/${this.media.id}`
            });
            if (success) {
                this.$store.dispatch('addSnack', {text: 'Deleted ' + this.media.filename}).then();
                this.next();
                this.$store.commit('reloadPhotos', this.media);
            } else {
                this.$store.dispatch('addSnack', {text: 'Failed to delete ' + this.media.filename}).then();
            }
            this.showPhotoMenu = false;
            this.deleteLoading = false;
        },
        async changeDate(date: Date) {
            if (this.media === null) return;
            let success = await this.$store.dispatch('apiRequest', {
                url: `photos/changeDate/${this.media.id}`,
                body: {date: date.getTime()}
            });
            if (success === true) {
                this.dateError = '';
                this.media.createDate = date;

                this.$store.commit('reloadPhotos', this.media);
                return true;
            } else {
                return false;
            }
        },
        async saveEditedDate() {
            if (this.media === null) return;
            let isDateMenu = this.dateMenu;
            this.dateLoading = true;
            let success = await this.changeDate(this.editedDate);
            if (success) {
                if (isDateMenu) this.dateMenu = false;
                else this.timeMenu = false;
            } else {
                this.dateError = isDateMenu ? 'Failed to set date!' : 'Failed to set time!';
            }
            this.dateLoading = false;
            this.showPhotoMenu = false;
        },
        openMaps(location: Location | null) {
            if (location === null)
                return;
            window.open(`https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}`)
        },
        async reprocess(media: Media) {
            this.reprocessLoading = true;
            let {id} = await this.$store.dispatch('apiRequest', {url: `photos/reprocess/${media.id}`});
            let path = this.$route.path.split('/').filter(p => p.length !== 0);
            path[path.length - 1] = id;
            await this.$router.replace(`/${path.join('/')}`);
            this.$store.commit('reloadPhotos', true);
            this.reprocessLoading = false;
            this.showPhotoMenu = false;
        },
        close() {
            let path = this.$route.path.split('/').filter(p => p.length !== 0);
            let newPath = '/' + path.slice(0, path.length - 2).join('/');
            this.$router.push(newPath);
        },
        previous() {
            this.photoGallery.swiper.slidePrev();
            return;
        },
        next() {
            this.photoGallery.swiper.slideNext();
            return;
        },
        async fullMediaLoad(idOverride: string | null = null) {
            let id = idOverride ?? this.media?.id ?? this.id;
            if (this.isLoading.has(id))
                return;
            this.isLoading.add(id);

            let unauthorizedRequest = !this.$store.getters.isLoggedIn && (this.$route.meta?.requiresAuth === false);
            let body = unauthorizedRequest ? {
                albumId: this.$route.params.albumId
            } : {};
            let media = await this.$store.dispatch('apiRequest', {
                url: `photos/${id}`,
                body,
                unauthorizedRequest,
            }).then(m => m ? Media.fromObject(m) : m);
            if (media === null) {
                let newPath = this.$route.path.split(this.$route.params.id);
                await this.$router.replace(newPath[0].substr(0, newPath[0].length - 6));
            } else {
                console.log('media loaded', media);
                if (idOverride !== null || this.media === null || id === this.media?.id) {
                    this.media = media;
                    this.$store.commit('keepInView', media);
                    this.loadInfo++;
                    console.log(this.media);
                }
                this.isLoading.delete(id);
            }
        },
        toHms(s: number) {
            return secondsToHms(s);
        },
    },
    computed: {
        originalFps(): number | null {
            if (!this.media) return null;
            let fps = +this.media.exif['com.android.capture.fps'];
            return isNaN(fps) ? null : fps;
        },
        avgFps(): number | null {
            if (!this.media) return null;
            let avgRate = this.media.exif?.video?.avg_frame_rate;
            if (avgRate) {
                let [ff1, ff2] = avgRate.split('/').map((n: string) => +n);
                return Math.round((ff1 / ff2) * 10) / 10;
            }
            return null;
        },
        isSelecting(): boolean {
            return this.$store.getters.isSelecting;
        },
        selected(): boolean {
            return this.$store.getters.isSelected(this.media?.id);
        },
        coordinate(): L.LatLng | null {
            if (this.media === null || this.media.location === null)
                return null;
            return L.latLng(this.media.location.latitude, this.media.location.longitude)
        },
        classifications(): { labels: string, glossary: string }[] | null {
            let classification = this.media?.classifications ?? null;
            if (classification === null)
                return null;
            const capitalize = (s: string) => s.substr(0, 1).toUpperCase() + s.substr(1);
            return classification.map(c => ({
                firstLabel: c.levels[0].labels[0],
                labels: c.levels[0].labels.slice(0, 3).join(', '),
                glossary: capitalize(c.levels[0].glossary),
            }))
        },
        country(): string | null {
            return this.media?.location?.places?.find?.(p => p.type === 'country')?.name ?? null;
        },
        place(): string | null {
            return this.media?.location?.places?.find?.(p => p.type === 'place')?.name ?? null;
        },
        subPlace(): string | null {
            return [...this.admins, this.country].join(', ')
        },
        admins(): string[] {
            let location = this.media?.location ?? null;
            if (location === null)
                return [];
            return location.places.filter(p => p.type !== 'place' && p.type !== 'country').map(p => p.name);
        },
        exposureTime(): string | null {
            let exposureTime = this.media?.exif?.ExposureTime ?? null;
            if (exposureTime === null)
                return null;
            if (exposureTime < 1)
                return `1/${Math.round(1 / exposureTime)}`
            return exposureTime.toString();
        },
        readableBytes(): string {
            return bytesToReadable(this.media?.size ?? 0);
        },
        showInfo: {
            get(): boolean {
                return this.$store.state.showInfo;
            },
            set(v: boolean) {
                this.$store.commit('showInfo', v);
            }
        },
        editedDate(): Date {
            return new Date(`${this.createDate} ${this.createTime}`);
        },
        formattedCreateTime(): string {
            let date = this.media?.createDate ?? new Date();
            return format(date, 'H:mm:ss');
        },
        formattedCreateDate(): string {
            let date = this.media?.createDate ?? new Date();
            return format(date, 'EEEE, do MMMM yyyy');
        },
        createTime: {
            get(): string {
                let date = this.editingDate ?? new Date();
                return format(date, 'H:mm:ss')
            },
            set(v: string) {
                this.editingDate = new Date(`${this.createDate} ${v}`);
            }
        },
        createDate: {
            get(): string {
                let date = this.editingDate ?? new Date();
                return format(parseISO(date.toISOString()), 'yyyy-MM-dd');
            },
            set(v: string) {
                if (this.media === null) return;
                this.editingDate = new Date(`${v} ${this.createTime}`);
            }
        },
        megaPixels(): number {
            return Math.round((this.media?.width ?? 0) * (this.media?.height ?? 0) / 100000) / 10;
        },
        canSkipLeft(): boolean {
            return this.index > 0;
        },
        canSkipRight(): boolean {
            return this.index + 1 < this.queue.length;
        },
        index(): number {
            return this.queue.findIndex(i => i.id === this.id);
        },
        queue(): Media[] {
            return this.$store.state.viewerQueue;
        },
        id(): string {
            return this.$route.params.id;
        },
        showPhotoButtons(): boolean {
            return this.$store.state.showPhotoButtons;
        },
    },
    watch: {
        showInfo() {
            if (this.$vuetify.breakpoint.mobile)
                return;
            let animationFrame = -1;
            const resize = () => {
                animationFrame = requestAnimationFrame(resize);
                console.log("ResizeHandler")
                this.photoGallery.swiper.resize.resizeHandler();
            }
            resize();
            setTimeout(() => cancelAnimationFrame(animationFrame), 250);
        },
        'media.location'() {
            this.gpsIcon = null;
            this.loadGpsIcon();
        },
        media() {
            if (this.media !== null)
                this.editingDate = this.media?.createDate ?? new Date();
        },
        id() {
            this.videoPlaying = false;
            this.fullMediaLoad(this.id);
        },
    },
})
</script>

<style scoped>
.media-photo {
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    position: fixed;
    background-color: grey;
    z-index: 6;
    --button-padding: 20px;
}

.left-pane {
    background-color: black;
    position: fixed;
    top: 0;
    left: 0;
    height: 100%;
    display: block;
    transition: width 0.25s;
}

.top-gradient {
    pointer-events: none;
    position: absolute;
    width: 100%;
    height: 100px;
    z-index: 2;
    background-image: linear-gradient(to bottom, rgba(0, 0, 0, 0.37), transparent);
    transition: transform 0.4s;
}

.photo-gallery {
    position: relative;
    width: 100%;
    height: 100%;
}

.btn {
    position: absolute;
    z-index: 3;
}

.back-button {
    top: var(--button-padding);
    left: var(--button-padding);
    transition: transform 0.4s;
}

.top-right-buttons {
    top: var(--button-padding);
    right: var(--button-padding);
    transition: transform 0.4s;
    display: flex;
}

.top-right-buttons > * {
    margin-left: 16px;
}

.bottom-buttons {
    padding: var(--button-padding);
    padding-top: 0;
    position: fixed;
    bottom: 0;
    width: 100%;
    display: flex;
    justify-content: space-evenly;
    transition: transform 0.4s;
}

.skip-button-container {
    height: calc(100% - 240px);
    top: 100px;
    position: absolute;
    width: 15%;
    min-width: 100px;
    z-index: 1;
    pointer-events: visible;
    cursor: pointer;
}

.prev-button-container {
    left: 0;
}

.prev-button {
    opacity: 0;
    top: calc(50% - 28px);
    left: var(--button-padding);
}

.prev-button-container:hover .prev-button {
    opacity: .8;
}

.next-button-container {
    right: 0;
}

.next-button-container:hover .next-button {
    opacity: .8;
}

.next-button {
    opacity: 0;
    top: calc(50% - 28px);
    right: var(--button-padding);
}

.right-pane {
    transition: transform 0.25s;
    right: 0;
    bottom: 0;
    height: 100%;
    position: fixed;
    display: block;
    z-index: 8;
    overflow-y: auto;
    padding: 0;
}

.info-header {
    padding: 20px;
    padding-bottom: 0;
    display: flex;
    align-items: center;
}

.mobile-header {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    height: 60px;
    padding: 0 !important;
}

.info-content {
    user-select: text;
}

.photo-info {
    display: flex;
    height: 22px;
    align-items: center;
}

.video-info {
    display: flex;
    align-items: center;
    height: 22px;
}

.location-map {
    cursor: pointer;
    width: 100%;
    height: 350px;
    opacity: 0.8;
}

</style>
