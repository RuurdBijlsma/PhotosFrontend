<template>
    <div class="home" ref="home" @scroll="homeScroll"
         :style="{maxHeight: `calc(100vh - ${$vuetify.application.top + $vuetify.application.bottom}px)`}">
        <router-view/>

        <div class="photos">
            <div class="lazy-month"
                 :style="{
                    height: loadedIndices[i].height === -1 ? info.height + 'px' : loadedIndices[i].height + 'px',
                    backgroundImage: loadedIndices[i].ready ? 'none' : null
                 }"
                 v-intersect="(...args) => applyLazy(i, ...args)"
                 v-for="(info, i) in monthInfo"
                 :key="info.id">
                <month-grid :index="i"
                            :year="info.year"
                            :month="info.month"
                            :usable-width="usableWidth - 17"
                            :ref="`monthGrid${i}`"
                            @ready="(h, p) => monthReady(i, h, p)"
                            v-if="loadedIndices[i].loaded"
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
// save scroll position when scrolling up and loading
// grid width is too narrow
// grid background is wrong on seams
// remove bad code from photogrid
// put shared code from photogrid and monthgrid in component

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
        canvas: {} as HTMLCanvasElement,
        context: {} as CanvasRenderingContext2D,
        yearTextSize: 13,
        renderAnimationFrame: -1,

        gridHeight: 240,
        photosPerMonth: [] as MonthPhotos[],
        photos: [] as Media[][],
        homeElement: {} as HTMLElement,
        loadedIndices: [] as { viewed: boolean, loaded: boolean, ready: boolean, height: number, photos: Media[] }[],
        scrollTimeout: -1,
        indexInView: 0,
        waitPpm: null as null | Promise<{ year: number, month: number, count: number }[]>,

        scrolling: false,
        scrubData: {percent: 0, year: d.getFullYear(), month: d.getMonth() + 1},
        scrubbing: false,
        overScrub: false,
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


        this.waitPpm = this.$store.dispatch('apiRequest', {url: 'photos/months'});
        let ppm = await this.waitPpm;
        this.loadedIndices = [...new Array(ppm.length)].map(() => ({
            viewed: false,
            loaded: false,
            ready: false,
            height: -1,
            photos: [],
        }));


        let loadingPhoto = this.$route.name === 'ScrollPhoto';
        if (!loadingPhoto && this.hasDate === null) {
            this.loadedIndices[0].loaded = true;
            setTimeout(() => {
                this.loadedIndices[1].loaded = true;
            }, 100);
        }
        this.photosPerMonth = ppm.map(({year = 0, month = 0, count = 0}) => ({
            year, month, count
        }));

        for (let i = 0; i < this.loadedIndices.length; i++)
            this.loadedIndices[i].height = this.monthInfo[i].height;

        if (this.hasDate !== null && !loadingPhoto)
            this.updateFromDateQuery();

        this.render();
    },
    methods: {
        homeScroll() {
            this.scrolling = true;
            clearTimeout(this.scrollTimeout);
            this.scrollTimeout = setTimeout(() => this.scrolling = false, 1000);
        },
        yToMonthPhotos(percentage: number) {
            let y = percentage * this.homeElement.scrollHeight;
            for (let i = 0; i < this.loadedIndices.length; i++) {
                y -= this.loadedIndices[i].height;
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
            if (true) this.drawLoadedRegion();
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
            for (let i = 0; i < this.loadedIndices.length; i++) {
                let l = this.loadedIndices[i];
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
                        this.canvas.width - 10,
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
                y += this.loadedIndices[i].height / scrollHeight * this.canvas.height;
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
        monthReady(i: number, monthHeight: number, photos: Media[]) {
            this.loadedIndices[i].photos = photos;
            this.loadedIndices[i].height = monthHeight;
            this.loadedIndices[i].ready = true;
            this.$emit('monthReady', i);
            this.$emit('monthReady' + i);
        },
        applyLazy(index: number, entries: [any], observer: IntersectionObserver, isIntersecting: boolean) {
            if (this.loadedIndices[index].viewed === isIntersecting)
                return;
            this.loadedIndices[index].viewed = isIntersecting;
            if (isIntersecting)
                this.indexInView = index;
            else if (this.indexInView === index)
                this.indexInView = this.loadedIndices.findIndex(l => l.viewed);
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
            }, 400);
            // If it's un-viewed for 5 seconds then unload it
            const unload = (i: number) => {
                let wasLoaded = this.loadedIndices[i].loaded;
                let isInView = this.loadedIndices[i].viewed;
                // Check if neighbours aren't in view
                if (i > 0)
                    isInView ||= this.loadedIndices[i - 1].viewed;
                if (i + 1 < this.loadedIndices.length)
                    isInView ||= this.loadedIndices[i + 1].viewed;
                if (!isInView && wasLoaded) {
                    this.loadedIndices[i].loaded = false;
                    this.loadedIndices[i].ready = false;
                    console.log("unloading", i);
                }
            }
            setTimeout(() => {
                unload(index);
                if (index + 1 < this.loadedIndices.length)
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
        scrollMediaIntoView(media: Media | null) {
            if (media === null)
                return;
            let index = this.dateToIndex(media.createDate);
            let l = this.loadedIndices[index];
            if (l.loaded) {
                let component: any = this.$refs['monthGrid' + index];
                if (component && component.length > 0)
                    component[0].scrollMediaIntoView(media);
            } else {
                this.scrollDateIntoView(media.createDate);
            }
        },
        scrollDateIntoView(date: Date | null) {
            if (date === null) return;

            let index = this.dateToIndex(date);
            if (index === -1) {
                // date not in photosPerMonth, find closest photosPerMonth;
                index = this.getClosestPhotoMonthIndex(date);
            }

            let scrollTop = 0;
            for (let i = 0; i < index; i++)
                scrollTop += this.loadedIndices[i].height;

            const scrollDateIntoView = () => {
                let component: any = this.$refs['monthGrid' + index];
                if (component && component.length > 0)
                    component[0].scrollDateIntoView(date);
            }

            if (this.loadedIndices[index].loaded) {
                scrollDateIntoView();
            } else {
                this.$nextTick(() => {
                    this.homeElement.scrollTop = scrollTop;
                    this.$once('monthReady' + index, () => this.$nextTick(() => scrollDateIntoView()));
                });
            }
        },
        updateFromDateQuery() {
            if (this.hasDate === null) return;
            this.scrollDateIntoView(this.hasDate);
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
        monthInfo(): { month: number, year: number, height: number, id: string }[] {
            const photoMargin = 5;
            const avgRatio = 4 / 3;
            let photosPerRow = this.usableWidth / (this.gridHeight * avgRatio);
            return this.photosPerMonth.map(p => ({
                height: Math.ceil(p.count / photosPerRow) * (this.gridHeight + photoMargin),
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
        photosQueue(): Media[] {
            let queue = [];
            for (let l of this.loadedIndices)
                queue.push(...l.photos);
            return queue;
        },
    },
    watch: {
        photosQueue() {
            this.$store.commit('viewerQueue', this.photosQueue);
        },
        async '$store.state.keepInView'() {
            await this.waitPpm;
            let media: Media | null = this.$store.state.keepInView;
            console.log('keep in view', media);
            this.scrollMediaIntoView(media);
        },
        '$route.query.date'() {
            console.log('date change');
            // this.updateFromDateQuery();
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
    width: 100%;
    background-image: url(/img/grid.png);
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
