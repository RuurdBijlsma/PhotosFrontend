<template>
    <div class="search">
        <photo-grid v-if="$store.state.searchResults.length > 0" :photos="$store.state.searchResults"></photo-grid>
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
    async mounted() {
        await this.updateSearch();
    },
    methods: {
        async updateSearch() {
            await this.$store.dispatch('search', this.query);
            console.log("search photos", this.$store.state.searchResults);
        },
    },
    computed: {
        query() {
            return this.$route.params.query;
        },
    },
    watch: {
        query() {
            this.updateSearch();
        }
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
