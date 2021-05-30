<template>
    <div class="search" ref="search" @scroll="homeScroll">
        <router-view/>
        <div v-if="loading" class="progress-center">
            <v-progress-circular color="primary" :size="$vuetify.breakpoint.width / 4" indeterminate/>
        </div>
        <photo-grid v-else-if="$store.state.searchResults.length > 0" :photos="slicedPhotos"></photo-grid>
        <div v-else class="no-results">
            <div class="no-results-center">
                <v-icon class="icon" x-large>mdi-cloud-search-outline</v-icon>
                <div class="caption">No results found for "{{ query }}"</div>
            </div>
        </div>
    </div>
</template>

<script lang="ts">
import Vue from 'vue'
import PhotoGrid from "@/components/PhotoGrid.vue";

export default Vue.extend({
    name: 'Search',
    components: {PhotoGrid},
    data: () => ({
        loading: false,
        endIndex: 100,
        prevScroll: -10000,
        searchElement: {} as HTMLDivElement,
    }),
    async mounted() {
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
        slicedPhotos() {
            return this.$store.state.searchResults.slice(0, this.endIndex);
        },
        query() {
            return this.$route.params.query;
        },
    },
    watch: {
        query() {
            this.updateSearch();
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
    height: calc(80vh - 64px);
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
    font-size: 40vw !important;
    opacity: 0.3;
}

.no-results .caption {
    font-size: 3vw !important;
    opacity: 0.8;
}

</style>
