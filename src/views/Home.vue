<template>
    <div class="home" ref="home" id="home-element"
         :style="{
            maxHeight: `calc(100vh - ${$vuetify.application.top + $vuetify.application.bottom}px)`,
            padding: pagePadding + 'px',
         }">
        <router-view/>

        <div class="photos" :style="{
            width: `calc(100% - ${scrubberWidth}px)`,
        }">
            <div class="lazy-month"
                 :style="{
                    height: photosPerMonth[i].ready ?
                        'auto' :
                        photosPerMonth[i].height + 'px',
                    backgroundImage: photosPerMonth[i].ready ? 'none' : 'url(img/grid.png)'
                 }"
                 v-intersect="(...args) => applyLazy(i, ...args)"
                 v-for="(monthPhotos, i) in photosPerMonth"
                 :key="monthPhotos.id">
                <month-grid :index="i"
                            :year="monthPhotos.year"
                            :month="monthPhotos.month"
                            :usable-width="usableWidth"
                            :ref="`monthGrid${i}`"
                            @resizeReady="h => monthResize(i, h)"
                            @ready="(h, p) => monthReady(i, h, p)"
                            v-if="monthPhotos.loaded"
                            class="month" :class="`month${i}`"/>
            </div>
        </div>

        <mobile-scrub class="scrubber"
                      v-if="$vuetify.breakpoint.mobile && photosPerMonth.length > 0"
                      home-id="home-element"
                      :index-in-view="indexInView"
                      :photos-per-month="photosPerMonth"></mobile-scrub>
        <desktop-scrub class="scrubber"
                       v-else-if="photosPerMonth.length > 0"
                       home-id="home-element"
                       :index-in-view="indexInView"
                       :photos-per-month="photosPerMonth">
        </desktop-scrub>
    </div>
</template>

<script lang="ts">
import {Media} from "@/ts/Media";
import {api} from "@/ts/constants"
import Vue from "vue";
import MonthGrid from "@/components/MonthGrid.vue";
import DesktopScrub from "@/components/DesktopScrub.vue";
import {MonthPhotos} from "@/ts/MediaInterfaces";
import MobileScrub from "@/components/MobileScrub.vue";

// todo
// mobile layout for info pane in large photo
// filter by date on /map page to see photos in that date range
// Upload photo
// Download photo
// backup knop in settings
// rotate image in ui
// make way to enlarge map in search page
// add mapbox token to Users account
// see server status in ui somewhere (save logs and show)
// animated webp not showing in grid, but showing in big pic?
// albums
// show logged in state in app bar
// allow log out
// add image subtype 'animation' for gifs
// refresh photo on search page is bugged
// Allow select in full /photo page

export default Vue.extend({
    name: 'Home',
    components: {MobileScrub, DesktopScrub, MonthGrid},
    data: () => ({
        api,

        gridHeight: 240,
        waitPpm: null as null | Promise<MonthPhotos[]>,

        homeElement: {} as HTMLElement,
        indexInView: 0,

        ignoreDateChange: false,
    }),
    async mounted() {
        this.homeElement = (this.$refs.home as HTMLElement);

        let loadingPhoto = this.$route.name === 'HomePhoto';
        await this.updatePhotosPerMonth(!loadingPhoto && this.hasDate === null, [0]);

        if (!loadingPhoto && this.hasDate === null)
            setTimeout(() => {
                let month2 = this.photosPerMonth[1];
                if (!month2) return;
                month2.loaded = true
            }, 500);
        if (this.hasDate !== null && !loadingPhoto)
            this.updateFromDateQuery();
        if (loadingPhoto) {
            for (let month of this.photosPerMonth)
                month.loaded = month.viewed;
        }
    },
    methods: {
        async updatePhotosPerMonth(preload: boolean, loadIndices: number[]) {
            const photoMargin = 5;
            const avgRatio = 4 / 3;
            let photosPerRow = this.usableWidth / (this.gridHeight * avgRatio);

            this.waitPpm = this.$store.dispatch('apiRequest', {url: 'photos/months'});
            let ppm = await this.waitPpm;
            this.photosPerMonth = ppm.map(({year = 0, month = 0, count = 0}, i) => ({
                year, month, count,
                viewed: loadIndices.includes(i),
                loaded: preload && loadIndices.includes(i),
                ready: false,
                height: Math.ceil(count / photosPerRow) * (this.gridHeight + photoMargin),
                photos: [],
                id: year.toString() + month,
            }));
        },
        monthResize(i: number, monthHeight: number) {
            Vue.set(this.photosPerMonth[i], 'height', monthHeight);
        },
        monthReady(i: number, monthHeight: number, photos: Media[]) {
            this.photosPerMonth[i].photos = photos;
            this.photosPerMonth[i].height = monthHeight;
            this.photosPerMonth[i].ready = true;
            this.$emit('monthReady', i);
            this.$emit('monthReady' + i);
        },
        applyLazy(index: number, entries: [any], observer: IntersectionObserver, isIntersecting: boolean) {
            if (this.photosPerMonth[index].viewed === isIntersecting)
                return;
            this.photosPerMonth[index].viewed = isIntersecting;
            if (isIntersecting)
                this.indexInView = index;
            else if (this.indexInView === index)
                this.indexInView = this.photosPerMonth.findIndex(l => l.viewed);
            // If it's in view for 250ms then load it (prevents load spam when scrolling quickly)
            setTimeout(() => {
                let isInView = this.photosPerMonth[index].viewed;
                if (isInView) {
                    if (index > 0)
                        this.photosPerMonth[index - 1].loaded = true;
                    this.photosPerMonth[index].loaded = true;
                    if (index + 1 < this.photosPerMonth.length)
                        this.photosPerMonth[index + 1].loaded = true;
                    console.log("loading", index);
                }
            }, index === 0 ? 0 : 400);
            // If it's un-viewed for 5 seconds then unload it
            const unload = (i: number) => {
                let wasLoaded = this.photosPerMonth[i].loaded;
                let isInView = this.photosPerMonth[i].viewed;
                // Check if neighbours aren't in view
                if (i > 0)
                    isInView ||= this.photosPerMonth[i - 1].viewed;
                if (i + 1 < this.photosPerMonth.length)
                    isInView ||= this.photosPerMonth[i + 1].viewed;
                if (!isInView && wasLoaded) {
                    this.photosPerMonth[i].loaded = false;
                    this.photosPerMonth[i].ready = false;
                    console.log("unloading", i);
                }
            }
            setTimeout(() => {
                unload(index);
                if (index + 1 < this.photosPerMonth.length)
                    unload(index + 1);
                if (index > 0)
                    unload(index - 1);
            }, 500);
        },
        dateToIndex(date: Date | null) {
            if (date === null) return -1;
            let year = date.getFullYear();
            let month = date.getMonth() + 1;
            return this.photosPerMonth.findIndex(l => l.year === year && l.month == month);
        },
        getClosestPhotoMonthIndex(date: Date) {
            let bestDistance = Infinity;
            let bestIndex = -1;
            let target = date.getTime();
            for (let i = 0; i < this.photosPerMonth.length; i++) {
                let photoMonth = this.photosPerMonth[i];
                // take middle of month, else 30 may will be considered nearer to june than may
                let distance = Math.abs(
                    new Date(photoMonth.year, photoMonth.month - 1, 15).getTime() - target
                );
                if (distance < bestDistance) {
                    bestDistance = distance;
                    bestIndex = i;
                } else {
                    // Photos per month is ordered, so when distance starts increasing we've passed the closest point
                    break;
                }
            }
            return bestIndex;
        },
        async scrollMediaIntoView(media: Media | null) {
            if (media === null)
                return;
            let index = this.dateToIndex(media.createDate);
            let l = this.photosPerMonth[index];
            if (l.ready) {
                let component: any = this.$refs['monthGrid' + index];
                if (component && component.length > 0)
                    component[0].scrollMediaIntoView(media);
            } else {
                // scroll to date to make this month load, then once it's ready try scrolling item into view again
                this.scrollDateIntoView(media.createDate, false);
                if (!l.ready)
                    await new Promise((resolve => this.$once('monthReady' + index, resolve)))
                await this.scrollMediaIntoView(media);
            }
        },
        scrollDateIntoView(date: Date | null, dayBased = true) {
            if (date === null) return;

            let index = this.dateToIndex(date);
            if (index === -1) {
                // date not in photosPerMonth, find closest photosPerMonth;
                index = this.getClosestPhotoMonthIndex(date);
            }

            let scrollTop = 0;
            for (let i = 0; i < index; i++)
                scrollTop += this.photosPerMonth[i].height;

            const scrollDateIntoView = () => {
                let component: any = this.$refs['monthGrid' + index];
                if (component && component.length > 0)
                    component[0].scrollDateIntoView(date, dayBased);
            }

            if (this.photosPerMonth[index].ready) {
                scrollDateIntoView();
            } else {
                this.$nextTick(() => {
                    this.homeElement.scrollTop = scrollTop;
                });
                this.$once('monthReady' + index, () => this.$nextTick(() => scrollDateIntoView()));
            }
        },
        updateFromDateQuery() {
            if (this.hasDate === null) return;
            this.scrollDateIntoView(this.hasDate);
        },
        async reloadPhotos(media: Media | null = null) {
            let viewedIndices = [];
            for (let i = 0; i < this.photosPerMonth.length; i++)
                if (this.photosPerMonth[i].viewed)
                    viewedIndices.push(i);
            await this.updatePhotosPerMonth(true, viewedIndices);
            this.$store.commit('clearCachedPhotos');
            for (let l of this.photosPerMonth) {
                l.loaded = false;
                l.ready = false;
            }
            await this.$nextTick();
            for (let l of this.photosPerMonth) {
                if (l.viewed) l.loaded = true;
            }
            if (media === null) return;
            await this.scrollMediaIntoView(media);
        },
    },
    computed: {
        photosPerMonth: {
            get(): MonthPhotos[] {
                return this.$store.state.photosPerMonth;
            },
            set(v: MonthPhotos[]) {
                this.$store.commit('photosPerMonth', v);
            },
        },
        hasDate(): null | Date {
            if (this.$route.query.date === undefined || this.$route.query.date === null) return null;
            let date = new Date(this.$route.query.date as string);
            if (isNaN(date.getDate())) return null;
            return date;
        },
        pagePadding(): number {
            return this.$vuetify.breakpoint.mobile ? 0 : 10;
        },
        scrubberWidth(): number {
            return this.$vuetify.breakpoint.mobile ? 0 : 50;
        },
        usableWidth(): number {
            return this.$vuetify.breakpoint.width -
                this.$vuetify.application.left - this.$vuetify.application.right -
                this.pagePadding * 2 - this.scrubberWidth;
        },
        totalPhotos(): number {
            let n = 0;
            for (let month of this.photosPerMonth)
                n += month.count;
            return n;
        },
        photosQueue(): Media[] {
            let queue = [];
            for (let l of this.photosPerMonth)
                queue.push(...l.photos);
            return queue;
        },
    },
    watch: {
        async '$store.state.reloadPhotos'() {
            let reloadPhotos = this.$store.state.reloadPhotos;
            if (reloadPhotos === false)
                return;
            this.$store.commit('reloadPhotos', false);
            await this.reloadPhotos(reloadPhotos === true ? null : reloadPhotos);
        },
        async '$store.state.scrollToTop'() {
            if (!this.$store.state.scrollToTop)
                return;
            this.$store.commit('scrollToTop', false);
            await this.waitPpm;
            this.homeElement.scrollTo({top: 0, behavior: "smooth"});
            await this.reloadPhotos();
        },
        async '$store.state.keepInView'() {
            await this.waitPpm;
            let media: Media | null = this.$store.state.keepInView;
            await this.scrollMediaIntoView(media);
        },
        '$route.query.date'() {
            if (this.ignoreDateChange) {
                this.ignoreDateChange = false;
                return;
            }
            if (this.hasDate === null) return;
            this.scrollDateIntoView(this.hasDate);
        },
        '$route.name'() {
            if (this.$route.name === 'HomePhoto')
                this.ignoreDateChange = true;
        },
        photosQueue() {
            this.$store.commit('viewerQueue', this.photosQueue);
        },
    }
})
</script>

<style scoped>
.home {
    overflow-y: scroll;
    width: 100%;
    -ms-overflow-style: none;
    scrollbar-width: none;
}

.home::-webkit-scrollbar {
    display: none;
}

.photos {
    position: relative;
    left: 0;
    bottom: 0;
    height: 100%;
}

.lazy-month {
    height: 100vh;
    margin-bottom: 3px;
    width: 100%;
    background-repeat: repeat;
}

.month {
    width: 100%;
    height: 100%;
}
</style>
