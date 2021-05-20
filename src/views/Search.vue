<template>
    <div class="search">
        <photo-grid :photos="$store.state.searchResults"></photo-grid>
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
            let query = this.$route.query.q as string;
            console.log(query);
            await this.$store.dispatch('search', this.$route.query.q);
            console.log("search photos", this.$store.state.searchResults);
        },
    },
    computed: {},
    watch: {
        '$route.query.q'() {
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
}
</style>
