<template>
    <div class="search" ref="search" @scroll="homeScroll"
         :style="{
            maxHeight: `calc(100vh - ${$vuetify.application.top + $vuetify.application.bottom}px)`,
            padding: pagePadding + 'px',
         }">
        <router-view/>
        <div v-if="loading" class="progress-center">
            <v-progress-circular color="primary" :size="$vuetify.breakpoint.width / 4" indeterminate/>
        </div>
        <div v-else-if="slicedPhotos.length === 0" class="no-results">
            <div class="no-results-center">
                <v-icon class="icon" x-large>mdi-cloud-search-outline</v-icon>
                <div class="caption">No results found for "{{ day }} - {{ month }}"</div>
            </div>
        </div>
        <photo-grid :usable-width="usableWidth"
                    ref="photoGrid"
                    v-if="slicedPhotos.length > 0"
                    :photos="slicedPhotos"/>
    </div>
</template>

<script lang="ts">
import Vue from 'vue'
import PhotoGrid from "@/components/PhotoGrid.vue";
import {Media} from "@/ts/Media";
import {months, scrollBarWidth} from "@/ts/constants";

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
        console.log(this.slicedPhotos);
    },
    methods: {
        async updateSearch() {
            this.loading = true;
            await this.$store.dispatch('dateSearch', {day: this.day, month: this.month});
            this.loading = false;
        },
        async homeScroll() {
            let scrollTop = this.searchElement.scrollTop;
            // If we haven't scrolled more than 180px since last scroll fire just return
            if (Math.abs(this.prevScroll - scrollTop) < 180)
                return;
            this.prevScroll = scrollTop;

            let scrollBottom = this.searchElement.scrollHeight - scrollTop - this.searchElement.clientHeight;
            if (scrollBottom < 3000 && this.endIndex < this.results.length) {
                this.endIndex += 100;
            }
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
        day(): number | null {
            let day = +this.$route.params.day;
            return isNaN(day) ? null : day;
        },
        month(): number | null {
            let monthString = this.$route.params.month;
            if (monthString === undefined || monthString === null)
                return null;
            return months.indexOf(monthString as string) + 1;
        },
        slicedPhotos(): Media[] {
            return this.results.slice(0, this.endIndex);
        },
        results(): Media[] {
            return this.$store.state.dateResults;
        },
    },
    watch: {
        day() {
            this.updateSearch();
        },
        month() {
            this.updateSearch();
        },
        results() {
            this.$store.commit('viewerQueue', this.results);
        },
        '$store.state.keepInView'() {
            if (this.$store.state.keepInView !== null) {
                let photoGrid: any = this.$refs.photoGrid;
                photoGrid.scrollMediaIntoView(this.$store.state.keepInView);
            }
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
