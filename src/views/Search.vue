<template>
    <div class="search" ref="search" @scroll="homeScroll"
         :style="{
            maxHeight: `calc(100vh - ${$vuetify.application.top + $vuetify.application.bottom}px)`,
            padding: pagePadding + 'px',
         }">
        <router-view/>
        <h1 class="search-query" v-if="!isPlace && !loading && allResults.length > 0">‟{{ query }}”</h1>
        <p class="search-glossary" v-if="!loading && allResults.length > 0 && isLabel">{{ glossary }}</p>

        <photo-map v-if="isPlace && bounds !== null"
                   :width="mapWidth"
                   :height="450"
                   :start-bounds="bounds"
                   :style="{
                        height: 450 + 'px',
                        margin: `-${pagePadding}px -${pagePadding}px 0`,
                        width: `calc(100% + ${pagePadding * 2}px);`,
                   }"
                   class="map-leaflet"/>
        <h1 class="search-query search-place" v-if="isPlace && !loading && allResults.length > 0">‟{{ placeName }}”</h1>
        <div :style="{height: 450 + 'px'}" v-else-if="isPlace" class="placeholder-map"></div>

        <div v-if="loading" class="progress-center">
            <v-progress-circular color="primary" :size="$vuetify.breakpoint.width / 4" indeterminate/>
        </div>
        <div v-else-if="allResults.length === 0" class="no-results">
            <div class="no-results-center">
                <v-icon class="icon" x-large>mdi-cloud-search-outline</v-icon>
                <div class="res-caption">No results found for "{{ query }}"</div>
            </div>
        </div>
        <photo-grid :usable-width="usableWidth"
                    :photos="highSlice"
                    v-if="!loading"
                    v-show="highResults.length > 0"
                    ref="photoGridHigh"/>
        <h2 class="mt-5 mb-5"
            v-if="endIndex >= highResults.length && highResults.length !== 0 && lowResults.length !== 0">
            Less related results
        </h2>
        <photo-grid :usable-width="usableWidth"
                    :photos="lowSlice"
                    v-if="!loading"
                    v-show="lowResults.length > 0"
                    ref="photoGridLow"/>
    </div>
</template>

<script lang="ts">
import Vue from 'vue'
import PhotoGrid from "@/components/PhotoGrid.vue";
import {Media} from "@/ts/Media";
import {api, scrollBarWidth} from "@/ts/constants";
import PhotoMap from "@/components/PhotoMap.vue";
import L from "leaflet";

export default Vue.extend({
    name: 'Search',
    components: {PhotoMap, PhotoGrid},
    data: () => ({
        api,
        loading: false,
        endIndex: 100,
        prevScroll: -10000,
        searchElement: {} as HTMLDivElement,
        photoGridLow: null as any,
        photoGridHigh: null as any,
        bounds: null as L.LatLngBounds | null,
    }),
    async mounted() {
        this.searchElement = this.$refs.search as HTMLDivElement;

        console.log(this.$vuetify);

        await this.updateSearch();
    },
    methods: {
        async updateSearch() {
            this.loading = true;
            this.bounds = null;
            await this.$store.dispatch('search', this.query);
            if (this.isPlace) {
                let bounds = await this.$store.dispatch('apiRequest', {url: `photos/boundingBox/${this.placeName}`});
                let minCorner = L.latLng(bounds.minlat, bounds.minlng, 0);
                let maxCorner = L.latLng(bounds.maxlat, bounds.maxlng, 0);
                this.bounds = L.latLngBounds(minCorner, maxCorner).pad(0.1);
            }
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
        pagePadding(): number {
            return this.$vuetify.breakpoint.mobile ? 0 : 10;
        },
        usableWidth(): number {
            return this.$vuetify.breakpoint.width -
                this.$vuetify.application.left - this.$vuetify.application.right -
                this.pagePadding * 2 - scrollBarWidth;
        },
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
            if (this.$store.state.keepInView !== null) {
                let photoGridLow: any = this.$refs.photoGridLow;
                let photoGridHigh: any = this.$refs.photoGridHigh;
                photoGridLow.scrollMediaIntoView(this.$store.state.keepInView);
                photoGridHigh.scrollMediaIntoView(this.$store.state.keepInView);
            }
        },
    }
})
</script>

<style scoped>
.search {
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
