<template>
    <div class="home" ref="home" @scroll="homeScroll">
        <photo-grid class="grid" :photos="photos"></photo-grid>
    </div>
</template>

<script lang="ts">
//TODO
// replace scrollbar with scrub bar
// click photo to view it large
// albums
// world with photos
// explore page with location tags and label tags
// show logged in state in app bar
// Delete photo
// Upload photo
// Download photo

import Vue from 'vue'
import PhotoGrid from "@/components/PhotoGrid.vue";

export default Vue.extend({
    name: 'Home',
    components: {PhotoGrid},
    data: () => ({
        photosPerMonth: [] as any[],
        photos: [] as any[],
        api: "http://localhost:3000",
        homeElement: {} as HTMLElement,
        scrollMonthOffset: 0,
        gettingPhotos: false,
    }),
    async mounted() {
        this.photosPerMonth = await this.$store.dispatch('apiRequest', {url: 'photos/months'});
        let [photos, newMonths] = await this.getPhotos({monthOffset: 0});
        this.photos = photos;
        this.scrollMonthOffset = newMonths;
        this.homeElement = (this.$refs.home as HTMLElement)
    },
    methods: {
        async homeScroll() {
            let scrollBottom = this.homeElement.scrollHeight - this.homeElement.scrollTop - this.homeElement.clientHeight;
            if (scrollBottom < 500 && !this.gettingPhotos) {
                let doneLoading = this.photosPerMonth.map(p => p.loaded ?? false).every(j => j === true);
                if (doneLoading)
                    return;
                let [photos, newMonths] = await this.getPhotos({monthOffset: this.scrollMonthOffset});
                this.scrollMonthOffset += newMonths;
                this.photos.push(...photos);
            }
        },
        async getPhotos({requestMinimum = 80, monthOffset = 0}) {
            this.gettingPhotos = true;
            // Get's at least 100 photos based on given start month/year
            let requestedMonths = [];
            for (let i = monthOffset; i < this.photosPerMonth.length; i++) {
                let month = this.photosPerMonth[i];
                month.loaded = true;
                requestedMonths.push(month);
                requestMinimum -= month.count;
                if (requestMinimum < 0)
                    break;
            }
            let photos = await this.$store.dispatch('apiRequest', {
                url: 'photos/month-photos',
                body: {months: requestedMonths.map(m => [m.year, m.month])}
            });
            console.log(this.photosPerMonth, photos);
            this.gettingPhotos = false;
            return [photos.flat(), requestedMonths.length];
        }
    },
    computed: {},
})
</script>

<style scoped>
.home {
    padding: 10px 10px 10px 10px;
    max-height: calc(100vh - 64px);
    overflow-y: scroll;
    width: 100%;
}

.grid {
    width: 100%;
}
</style>
