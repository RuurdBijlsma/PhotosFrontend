<template>
    <div class="home" ref="home" @scroll="homeScroll"
         :style="{maxHeight: `calc(100vh - ${$vuetify.application.top + $vuetify.application.bottom}px)`}">
        <router-view/>

        <div class="photos">
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

        <canvas :width="100"
                :height="canvasHeight"
                :style="{height: canvasHeight + 'px'}"
                ref="scrubber" class="scrubber scrubber-canvas"/>
        <div class="scrubber scrubber-events"
             :style="{height: canvasHeight + 'px'}"
             @mouseenter="overScrub=true"
             @mouseleave="overScrub=false"
             @mousedown="scrubStart"/>
    </div>
</template>

<script lang="ts">
import {Media} from "@/ts/Media";
import {api} from "@/ts/constants"
import Vue from "vue";
import MonthGrid from "@/components/MonthGrid.vue";
import {shortMonths} from "@/ts/utils";

// todo
// Add settings page
//      On this page:
//      Set api url
//      See failed processes and get button to retry them
// Upload photo
// select photos and do batch actions (actions also in menu in Photo.vue)
// Download photo
// backup knop in settings
// rotate image in ui
// make way to enlarge map in search page
// add mapbox token to Users account
// make map component with images that load on panning the map
// dark map theme
// see server status in ui somewhere (save logs and show)
// map view in big photo view
// animated webp not showing in grid, but showing in big pic?
// video controls in big photo viewer
// albums
// world with photos
// andere scrub visuals voor mobile
// show logged in state in app bar
// add image subtype 'animation' for gifs
// refresh photo on search page is bugged

interface MonthPhotos {
    year: number,
    month: number,
    count: number,
    viewed: boolean,
    loaded: boolean,
    ready: boolean,
    height: number,
    photos: Media[],
    id: string,
}

const d = new Date();
export default Vue.extend({
    name: 'Home',
    components: {MonthGrid},
    data: () => ({
        api,
        canvas: {} as HTMLCanvasElement,
        context: {} as CanvasRenderingContext2D,
        yearTextSize: 13,
        renderAnimationFrame: -1,

        gridHeight: 240,
        waitPpm: null as null | Promise<MonthPhotos[]>,
        photosPerMonth: [] as MonthPhotos[],
        homeElement: {} as HTMLElement,
        scrollTimeout: -1,
        indexInView: 0,

        scrolling: false,
        scrubData: {percent: 0, year: d.getFullYear(), month: d.getMonth() + 1},
        scrubbing: false,
        overScrub: false,
        ignoreDateChange: false,
    }),
    beforeDestroy() {
        cancelAnimationFrame(this.renderAnimationFrame);
        document.removeEventListener('mousemove', this.scrubMove);
        document.removeEventListener('mouseup', this.scrubEnd);
    },
    async mounted() {
        document.addEventListener('mousemove', this.scrubMove, false);
        document.addEventListener('mouseup', this.scrubEnd, false);

        this.canvas = this.$refs.scrubber as HTMLCanvasElement;
        this.context = this.canvas.getContext('2d') as CanvasRenderingContext2D;
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
            console.log(this.photosPerMonth);
            for (let month of this.photosPerMonth)
                month.loaded = month.viewed;
        }

        this.render();
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
        homeScroll() {
            this.scrolling = true;
            clearTimeout(this.scrollTimeout);
            this.scrollTimeout = setTimeout(() => this.scrolling = false, 1000);
        },
        yToMonthPhotos(percentage: number) {
            let y = percentage * this.homeElement.scrollHeight;
            for (let i = 0; i < this.photosPerMonth.length; i++) {
                y -= this.photosPerMonth[i].height;
                if (y <= 0)
                    return this.photosPerMonth[i];
            }
            return this.photosPerMonth[this.photosPerMonth.length - 1];
        },
        render() {
            this.renderAnimationFrame = requestAnimationFrame(this.render);
            this.context.font = `${this.yearTextSize}px Roboto`;
            this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
            let greyedYears = !this.scrubbing && !this.overScrub;
            if (false) this.drawLoadedRegion();
            this.drawYears(greyedYears);
            if (this.overScrub || this.scrubbing) {
                this.drawScrollThumb(
                    this.scrubData.percent * this.canvas.height, this.scrubData.year, this.scrubData.month,
                    false,
                    true,
                );
            }
            let ppmInView = this.photosPerMonth[this.indexInView];
            if (this.scrolling && !this.scrubbing) {
                let y = this.homeElement.scrollTop / this.homeElement.scrollHeight * this.canvas.height;
                this.drawScrollThumb(
                    y, ppmInView.year ?? 0, ppmInView.month ?? 0,
                    true,
                    true,
                );
            } else if (!this.scrubbing) {
                let y = this.homeElement.scrollTop / this.homeElement.scrollHeight * this.canvas.height;
                this.drawScrollThumb(
                    y, ppmInView.year ?? 0, ppmInView.month ?? 0,
                    true,
                    false,
                );
            }
        },
        drawLoadedRegion() {
            this.context.fillStyle = 'rgba(50,255,100,0.16)';
            let width = 50;
            let y = 0;
            let scrollHeight = this.homeElement.scrollHeight;
            for (let i = 0; i < this.photosPerMonth.length; i++) {
                let l = this.photosPerMonth[i];
                if (l.loaded) {
                    this.context.fillRect(
                        this.canvas.width - width,
                        y / scrollHeight * this.canvas.height,
                        width,
                        l.height / scrollHeight * this.canvas.height);
                }
                y += l.height;
            }
        },
        drawScrollThumb(y: number, year: number, month: number, smallLine = false, includeText = true) {
            let textSize = 15;
            let boxHeight = textSize + 10 + 3;
            let textY = y;
            if (textY < boxHeight && includeText)
                textY = boxHeight;
            let isDark = this.$vuetify.theme.dark;

            if (includeText) {
                this.context.fillStyle = isDark ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.7)';
                let text = `${shortMonths[month - 1]} ${year}`;
                let {width} = this.context.measureText(text);
                this.context.fillRect(this.canvas.width - width - 10,
                    textY - textSize - 10, width + 10, textSize + 10);
                this.context.fillStyle = isDark ? '#e2e2e2' : '#171717';
                this.context.fillText(text, this.canvas.width - width - 5, textY - textSize + 5);
            }

            this.context.fillStyle = this.$vuetify.theme.themes[isDark ? 'dark' : 'light'].primary as string;
            let lineWidth = smallLine ? 35 : 50;
            this.context.fillRect(this.canvas.width - lineWidth, y, lineWidth, smallLine ? 2 : 3);

        },
        drawYears(greyedYears = false) {
            let isDark = this.$vuetify.theme.dark;
            let y = 0;
            let currentYear = -1;
            let usedParts = [] as number[][];
            let scrollHeight = this.homeElement.scrollHeight;
            for (let i = this.photosPerMonth.length - 1; i >= 0; i--) {
                if (!greyedYears) {
                    this.context.beginPath();
                    this.context.fillStyle = isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'
                    this.context.arc(
                        this.canvas.width - 7,
                        this.canvas.height - y,
                        2, 0, 2 * Math.PI);
                    this.context.fill();
                }

                let month = this.photosPerMonth[i];
                if (month.year !== currentYear) {
                    currentYear = month.year;
                    let text = currentYear.toString();
                    let {width} = this.context.measureText(text);
                    let textY = y;
                    const isYFree = (yValue: number) => {
                        for (let [low, high] of usedParts)
                            if (yValue >= low && yValue <= high)
                                return false;
                        return true;
                    }
                    while (!isYFree(textY))
                        textY += this.yearTextSize;
                    usedParts.push([textY, textY + this.yearTextSize]);
                    this.context.fillStyle = isDark ? (greyedYears ? 'rgba(255,255,255,0.5)' : 'white') : (greyedYears ? 'rgba(0,0,0,0.5)' : 'black');
                    this.context.fillText(text, this.canvas.width - width - 15, this.canvas.height - textY);
                }
                y += this.photosPerMonth[i].height / scrollHeight * this.canvas.height;
            }
        },
        scrubStart(e: MouseEvent) {
            this.scrubbing = true;
            let [percent] = this.dateFromScrubEvent(e);
            this.homeElement.scrollTo({top: this.homeElement.scrollHeight * percent});
        },
        scrubMove(e: MouseEvent) {
            if (this.scrubbing) {
                let [percent] = this.dateFromScrubEvent(e);
                this.homeElement.scrollTo({top: this.homeElement.scrollHeight * percent});
            }
            if (this.overScrub || this.scrubbing) {
                let y = e.pageY - this.$vuetify.application.top;
                let mp = this.yToMonthPhotos(y / this.canvas.height);
                this.scrubData = {percent: y / this.canvas.height, year: mp.year, month: mp.month};
            }
        },
        scrubEnd(e: MouseEvent) {
            if (this.scrubbing) {
                this.scrubbing = false;
            }
        },
        dateFromScrubEvent(e: MouseEvent): [number, MonthPhotos] {
            let percent = (e.pageY - this.$vuetify.application.top) / this.canvas.height;
            percent = Math.max(0, Math.min(1, percent * 1.01));
            let mp = this.yToMonthPhotos(percent);
            return [percent, mp];
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
            console.log("Reloaded photos");
            if (media === null) return;
            await this.scrollMediaIntoView(media);
        },
    },
    computed: {
        hasDate(): null | Date {
            if (this.$route.query.date === undefined || this.$route.query.date === null) return null;
            let date = new Date(this.$route.query.date as string);
            if (isNaN(date.getDate())) return null;
            return date;
        },
        canvasHeight(): number {
            return this.$vuetify.breakpoint.height - this.$vuetify.application.top - this.$vuetify.application.bottom;
        },
        usableWidth(): number {
            const pagePadding = 10;
            const scrubberWidth = 40;
            return this.$vuetify.breakpoint.width -
                this.$vuetify.application.left - this.$vuetify.application.right -
                pagePadding * 2 - scrubberWidth;
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
    padding: 10px;
    -ms-overflow-style: none;
    scrollbar-width: none;
}

.home::-webkit-scrollbar {
    display: none;
}

.photos {
    width: calc(100% - 40px);
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

.scrubber-events {
    width: 50px !important;
    cursor: pointer;
}

.scrubber {
    width: 100px;
    height: 100%;
    position: absolute;
    right: 0;
    top: 0;
}

.scrubber-canvas {
    pointer-events: none;
}
</style>
