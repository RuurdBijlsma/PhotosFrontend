<template>
    <div class="home">
        <photo-grid :photos="photos"></photo-grid>
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
    }),
    async mounted() {
        this.photosPerMonth = await fetch(`${this.api}/photos/months`).then(t => t.json());
        await this.getPhotos();
    },
    methods: {
        async getPhotos() {
            // Get's at least 100 photos based on given start month/year
            let requestMinimum = 100;
            const startMonthIndex = 0;
            let requestedMonths = [];
            for (let i = startMonthIndex; i < this.photosPerMonth.length; i++) {
                let month = this.photosPerMonth[i];
                requestedMonths.push(month);
                requestMinimum -= month.count;
                if (requestMinimum < 0)
                    break;
            }
            let photos = await fetch(
                `${this.api}/photos/month-photos`,
                {
                    method: "POST",
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(requestedMonths.map(m => [m.year, m.month]))
                }
            ).then(j => j.json()).then(j => j.flat());
            console.log(this.photosPerMonth, this.photos);
            this.photos = photos.slice(0, Math.floor(photos.length / 2));
            setTimeout(() => {
                this.photos.push(...photos.slice(Math.floor(photos.length / 2)))
                setTimeout(() => {
                    this.photos = this.photos.slice(Math.floor(photos.length / 2));
                }, 3000);
            }, 3000);
        }
    },
    computed: {},
})
</script>

<style scoped>
.home {
    padding: 10px 0px 10px 10px;
    max-height: calc(100vh - 64px);
    overflow-y: auto;
}
</style>
