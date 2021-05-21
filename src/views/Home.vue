<template>
    <div class="home" ref="home" @scroll="homeScroll">
        <photo-grid ref="photoGrid" class="grid" :photos="photos"></photo-grid>
        <div class="scrubber" @click="scrub" @mousemove="showScrub"></div>
    </div>
</template>

<script lang="ts">
//TODO
// if too much is loaded remove far away pictures
// if scrubbing to something loaded, then just scroll
// scroll to exact spot

// Add settings page
// Change api constant to setting in settings page
// Werkt zoeken naar "gibraltar pizza"?
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
import {api} from "@/ts/constants"

export default Vue.extend({
    name: 'Home',
    components: {PhotoGrid},
    data: () => ({
        photosPerMonth: [] as any[],
        photos: [] as any[],
        api,
        homeElement: {} as HTMLElement,
        scrollMonthStart: 0,
        scrollMonthLength: 0,
        gettingPhotos: false,
        scrollBuffer: 0,
        scrolling: false,
        scrollTimeout: false,
    }),
    async mounted() {
        this.photosPerMonth = await this.$store.dispatch('apiRequest', {url: 'photos/months'});
        let [photos, newMonths] = await this.getPhotos({monthOffset: 0});
        this.photos = photos;
        this.scrollMonthLength = newMonths;
        this.homeElement = (this.$refs.home as HTMLElement);

        console.log(this.photosPerMonth);
    },
    methods: {
        dateFromScrubEvent(e: MouseEvent) {
            let percent = (e.pageY - this.$vuetify.application.top) / (this.$vuetify.breakpoint.height - this.$vuetify.application.top)
            percent = Math.max(0, Math.min(1, percent * 1.01))
            let totalCount = this.photosPerMonth.map(t => t.count).reduce((a, b) => a + b);
            let targetPhoto = totalCount * percent;
            let counter = 0;
            let index = 0, day = 0, month = 0, year = 0;
            for (index = 0; index < this.photosPerMonth.length; index++) {
                let monthObj = this.photosPerMonth[index];
                if (counter + monthObj.count >= targetPhoto) {
                    month = monthObj.month;
                    year = monthObj.year;
                    let daysInMonth = new Date(year, month + 1 % 12, 0).getDate();
                    let monthPercentage = 1 - (targetPhoto - counter) / monthObj.count;
                    day = Math.floor(daysInMonth * monthPercentage);
                    break;
                }
                counter += monthObj.count;
            }
            return [index, day, month, year];
        },
        async showScrub(e: MouseEvent) {
            let [index, day, month, year] = this.dateFromScrubEvent(e);
            console.log(day, month, year, this.photosPerMonth[index])
        },
        async scrub(e: MouseEvent) {
            let [index, day, month, year] = this.dateFromScrubEvent(e);

            console.log('scroll to :', [day, month, year]);
            let [photos, newMonths] = await this.getPhotos({monthOffset: index});
            this.scrollMonthStart = index;
            this.scrollMonthLength = newMonths;
            this.photosPerMonth.forEach(p => p.loaded = false);
            for (let i = 0; i < this.photosPerMonth.length; i++) {
                let month = this.photosPerMonth[i];
                month.loaded = i > index && i <= index + newMonths;
            }
            this.photos = photos;
        },
        async homeScroll() {
            if (this.scrollTimeout) return;
            this.scrollTimeout = true;
            setTimeout(() => this.scrollTimeout = false, 500);

            let scrollTop = this.homeElement.scrollTop;
            let scrollBottom = this.homeElement.scrollHeight - scrollTop - this.homeElement.clientHeight;
            if (scrollTop < 2000 && !this.gettingPhotos) {
                let topReached = this.photosPerMonth[0].loaded ?? false;
                if (topReached) {
                    console.log("Reached top")
                    return;
                }

                let [photos, newMonths] = await this.getPhotos({
                    monthOffset: this.scrollMonthStart,
                    up: true,
                });
                this.scrollMonthStart -= newMonths;

                this.$refs.photoGrid.prepareUnshift();
                this.photos.unshift(...photos);
            }
            if (scrollBottom < 2000 && !this.gettingPhotos) {
                let bottomReached = this.photosPerMonth[this.photosPerMonth.length - 1].loaded ?? false;
                if (bottomReached) return;

                let [photos, newMonths] = await this.getPhotos({
                    monthOffset: this.scrollMonthStart + this.scrollMonthLength
                });
                this.scrollMonthLength += newMonths;
                this.photos.push(...photos);
            }
        },
        async getPhotos({requestMinimum = 80, monthOffset = 0, up = false}) {
            this.gettingPhotos = true;
            // Get's at least 100 photos based on given start month/year
            let requestedMonths = [];
            for (let i = monthOffset; up ? i >= 0 : i < this.photosPerMonth.length; i += up ? -1 : 1) {
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
    position: relative;
    left: 0;
    bottom: 0;
    height: 100%;
}

.scrubber {
    width: 40px;
    background-color: rgba(255, 0, 0, 0.5);
    height: 100%;
    position: absolute;
    right: 0;
    bottom: 0;
}
</style>
