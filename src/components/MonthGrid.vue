<template>
    <photo-grid
        v-if="loadedPhotos"
        @ready="h => $emit('ready', h, photos)"
        @resizeReady="h => $emit('resizeReady', h)"
        ref="photoGrid"
        class="month-grid"
        :usable-width="usableWidth"
        :photos="photos"/>
</template>

<script lang="ts">
import {Media} from "@/ts/Media";
import Vue from "vue";
import GridPhoto from "@/components/GridPhoto.vue";
import PhotoGrid from "@/components/PhotoGrid.vue";

const d = new Date();
export default Vue.extend({
    name: 'MonthGrid',
    components: {PhotoGrid, GridPhoto},
    props: {
        usableWidth: {type: Number, required: true},
        year: {type: Number, required: true},
        month: {type: Number, required: true},
        index: {type: Number, required: true},
    },
    data: () => ({
        photoGrid: null as null | any,
        photos: [] as Media[],
        loadedPhotos: false,
    }),
    async mounted() {
        this.photos = await this.$store.dispatch('getCachedPhotos', {year: this.year, month: this.month});
        this.loadedPhotos = true;
    },
    methods: {
        scrollDateIntoView(date: Date, dayBased = true) {
            let pg: any = this.$refs.photoGrid;
            pg.scrollDateIntoView(date, dayBased);
        },
        scrollMediaIntoView(media: Media | null) {
            let pg: any = this.$refs.photoGrid;
            pg.scrollMediaIntoView(media);
        },
    },
})
</script>

<style scoped>
.month-grid {
    height: 100%;
}
</style>
