<template>
    <div class="home" ref="home"
         :style="{maxHeight: `calc(100vh - ${$vuetify.application.top + $vuetify.application.bottom}px)`}">
        <div class="photos">
            <div class="lazy-month"
                 :style="{
                    height: loadedIndices[i].height === -1 ? info.height + 'px' : loadedIndices[i].height + 'px',
                    backgroundImage: loadedIndices[i].ready ? 'none' : null
                 }"
                 v-intersect.quiet="(...args) => applyLazy(i, ...args)"
                 v-for="(info, i) in monthInfo"
                 :key="info.id">
                <month-grid :index="i"
                            :year="info.year"
                            :month="info.month"
                            :usable-width="usableWidth - 17"
                            @ready="h => monthReady(i, h)"
                            v-if="loadedIndices[i].loaded"
                            class="month"/>
            </div>
        </div>
    </div>
</template>

<script lang="ts">
import {Media} from "@/ts/Media";
import {api} from "@/ts/constants"
import Vue from "vue";
import MonthGrid from "@/components/MonthGrid.vue";

// todo
// scrubber canvas
// Media overlay from photo grid
// interactivity in block date and media items

interface MonthPhotos {
    year: number,
    month: number,
    count: number,
}

const d = new Date();
export default Vue.extend({
    name: 'Scroll',
    components: {MonthGrid},
    data: () => ({
        api,
        gridHeight: 260,
        photosPerMonth: [] as MonthPhotos[],
        photos: [] as Media[][],
        homeElement: {} as HTMLElement,
        loadedIndices: [] as { viewed: boolean, loaded: boolean, ready: boolean, height: number }[],
        lazyTimeout: -1,
    }),
    async mounted() {
        this.homeElement = (this.$refs.home as HTMLElement);
        let ppm = await this.$store.dispatch('apiRequest', {url: 'photos/months'});
        this.loadedIndices = [...new Array(ppm.length)].map(() => ({
            viewed: false,
            loaded: false,
            ready: false,
            height: -1,
        }));
        this.loadedIndices[0].viewed = true;
        this.loadedIndices[0].loaded = true;
        setTimeout(() => {
            this.loadedIndices[1].viewed = true;
            this.loadedIndices[1].loaded = true;
        }, 100);
        this.photosPerMonth = ppm.map(({year = 0, month = 0, count = 0}) => ({
            year, month, count
        }));
        console.log(this.photosPerMonth);
    },
    methods: {
        monthReady(i: number, monthHeight: number) {
            this.loadedIndices[i].height = monthHeight;
            this.loadedIndices[i].ready = true;
        },
        applyLazy(index: number, entries: [any], observer: IntersectionObserver, isIntersecting: boolean) {
            this.loadedIndices[index].viewed = isIntersecting;
            // If it's in view for 250ms then load it (prevents load spam when scrolling quickly)
            setTimeout(() => {
                let isInView = this.loadedIndices[index].viewed;
                if (isInView) {
                    if (index > 0)
                        this.loadedIndices[index - 1].loaded = true;
                    this.loadedIndices[index].loaded = true;
                    if (index + 1 < this.loadedIndices.length)
                        this.loadedIndices[index + 1].loaded = true;
                    console.log("loading", index);
                }
            }, 500);
            // If it's un-viewed for 5 seconds then unload it
            setTimeout(() => {
                let wasLoaded = this.loadedIndices[index].loaded;
                let isInView = this.loadedIndices[index].viewed;
                // Check if neighbours aren't in view
                if (index > 0)
                    isInView ||= this.loadedIndices[index - 1].viewed;
                if (index + 1 < this.loadedIndices.length)
                    isInView ||= this.loadedIndices[index + 1].viewed;
                if (!isInView && wasLoaded) {
                    this.loadedIndices[index].loaded = false;
                    this.loadedIndices[index].ready = false;
                    console.log("unloading", index);
                }
            }, 5000);
        }
    },
    computed: {
        usableWidth(): number {
            const pagePadding = 10;
            return this.$vuetify.breakpoint.width - this.$vuetify.application.left - this.$vuetify.application.right - pagePadding * 2;
        },
        monthInfo(): { month: number, year: number, height: number, id: string }[] {
            const photoMargin = 5;
            const avgRatio = 4 / 3;
            let photosPerRow = this.usableWidth / (this.gridHeight * avgRatio);
            return this.photosPerMonth.map(p => ({
                height: p.count * (this.gridHeight + photoMargin) / photosPerRow,
                year: p.year,
                month: p.month,
                id: p.year.toString() + p.month,
            }));
        },
        flatPhotos(): Media[] {
            return this.photos.flat();
        },
        totalPhotos(): number {
            let n = 0;
            for (let month of this.photosPerMonth)
                n += month.count;
            return n;
        },
    },
    watch: {}
})
</script>

<style scoped>
.home {
    overflow-y: scroll;
    width: 100%;
    padding: 10px;
}

.lazy-month {
    height: 100vh;
    width: 100%;
    margin-bottom: 20px;
    background-image: url(/img/grid.png);
    background-repeat: repeat;
}

.month {
    width: 100%;
    height: 100%;
}
</style>
