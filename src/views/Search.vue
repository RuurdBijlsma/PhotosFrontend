<template>
    <div class="search" ref="search" @scroll="homeScroll">
        <router-view/>
        <div v-if="loading" class="progress-center">
            <v-progress-circular color="primary" :size="$vuetify.breakpoint.width / 4" indeterminate/>
        </div>
        <div v-else-if="allResults.length === 0" class="no-results">
            <div class="no-results-center">
                <v-icon class="icon" x-large>mdi-cloud-search-outline</v-icon>
                <div class="caption">No results found for "{{ query }}"</div>
            </div>
        </div>
        <photo-grid v-if="!loading" ref="photoGrid" v-show="highResults.length > 0" :photos="highSlice"/>
        <h2 class="mt-5 mb-5" v-if="endIndex >= highResults.length && highResults.length !== 0 && lowResults.length !== 0">
            Less related results
        </h2>
        <photo-grid v-if="!loading" ref="photoGrid" v-show="lowResults.length > 0" :photos="lowSlice"/>
    </div>
</template>

<script lang="ts">
import Vue from 'vue'
import PhotoGrid from "@/components/PhotoGrid.vue";
import {Media} from "@/ts/Media";
import {months} from "@/ts/utils";

export default Vue.extend({
    name: 'Search',
    components: {PhotoGrid},
    data: () => ({
        loading: false,
        endIndex: 100,
        prevScroll: -10000,
        searchElement: {} as HTMLDivElement,
        photoGrid: null as any,
    }),
    async mounted() {
        this.photoGrid = this.$refs.photoGrid;
        this.searchElement = this.$refs.search as HTMLDivElement;
        await this.updateSearch();
    },
    methods: {
        async updateSearch() {
            this.loading = true;
            await this.$store.dispatch('search', this.query);
            this.loading = false;
        },
        async homeScroll() {
            let scrollTop = this.searchElement.scrollTop;
            // If we haven't scrolled more than 180px since last scroll fire just return
            if (Math.abs(this.prevScroll - scrollTop) < 180)
                return;
            this.prevScroll = scrollTop;

            let scrollBottom = this.searchElement.scrollHeight - scrollTop - this.searchElement.clientHeight;
            if (scrollBottom < 3000)
                this.endIndex += 100;
        },
    },
    computed: {
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
            return this.$store.state.searchResultsHigh;
        },
        lowResults(): Media[] {
            return this.$store.state.searchResultsLow;
        },
        allResults(): Media[] {
            return this.highResults.concat(this.lowResults);
        },
    },
    watch: {
        query() {
            this.updateSearch();
        },
        results() {
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

.no-results .caption {
    font-size: 3vh !important;
    opacity: 0.8;
}

</style>
