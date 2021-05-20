<template>
    <div class="home" ref="home" @scroll="homeScroll">
        <photo-grid class="grid" :photos="photos"></photo-grid>
    </div>
</template>

<script lang="ts">
//TODO
// Get actual viewport with excluding scrollbar
// Separate functions
// Separate into vue component
// Update layout on window resize
// After 2nd half of photos is added a padding seems to be added to the right (or just when the second calculate layout is called)
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
        this.photosPerMonth = await fetch(`${this.api}/photos/months`).then(t => t.json());
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
            let photos = await fetch(
                `${this.api}/photos/month-photos`,
                {
                    method: "POST",
                    headers: {'Content-Type': 'application/json',},
                    body: JSON.stringify(requestedMonths.map(m => [m.year, m.month]))
                }
            ).then(j => j.json());
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
    overflow-y: auto;
    width: 100%;
}

.grid {
    width: 100%;
}
</style>
