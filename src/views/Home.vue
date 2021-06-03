<template>
    <div class="home" ref="home" @scroll="homeScroll">
        <router-view/>
        <div v-if="initialLoading" class="progress-center">
            <v-progress-circular color="primary" :size="$vuetify.breakpoint.width / 4" indeterminate/>
        </div>
        <div v-else-if="flatPhotos.length === 0" class="no-results">
            <div class="no-results-center">
                <v-icon class="icon" x-large>mdi-image</v-icon>
                <div class="caption">No photos"</div>
            </div>
        </div>
        <div class="grid">
            <div class="loading-top" v-if="!topLoaded&& !initialLoading">
                <v-progress-linear indeterminate></v-progress-linear>
            </div>
            <photo-grid timeline ref="photoGrid" :photos="flatPhotos"/>
            <div class="loading-bottom" v-if="!bottomLoaded && !initialLoading">
                <v-progress-linear indeterminate></v-progress-linear>
            </div>
        </div>

        <canvas :width="100"
                :height="canvasHeight"
                ref="scrubber" class="scrubber scrubber-canvas"/>
        <div class="scrubber scrubber-events"
             @mouseenter="overScrub=true"
             @mouseleave="overScrub=false"
             @mousedown="scrubStart"/>
    </div>
</template>

<script lang="ts">
//TODO
// ui button for reprocess item
// ui for changing date
// Keybinds for next/prev photo
// Test out grouping search results in 2 groups, rank high and rank low then sort by date within those ranks
// Mogelijk probleemkind: 20150720_200752, komt wss door fiximgdims
// CHeck if "20 7" works to go to /date/20/july
// Remember show info state
// Search by year/month/day/date (separate api call when date search is detected, detect this in App.vue)
//      "2017" / "January 2017" / "Jan 2017" / "6 jan" / "6 jan 2017" / 5 1 2017 / 5 1 / 1 2017
// Add settings page
// click photo to view it large
// Large photo needs next button (secretly scroll that photo into view in background when doing that to keep the list loaded)
// albums
// When searching location, show map with images like the photos app
// When searching {month} {year} just scrub to that place? (add support for /date/6/1/2020 in url for homepage)
// world with photos
// explore page with location tags and label tags
// show logged in state in app bar
// Delete photo
// Upload photo
// Download photo
// If randomLabels or randomLocations is not fast enough, add a level field to the suggestions table and use that

import {Media} from "@/ts/Media";
import Vue from 'vue'
import PhotoGrid from "@/components/PhotoGrid.vue";
import {api} from "@/ts/constants"

const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',];

interface MonthPhotos {
    year: number,
    month: number,
    count: number,
}

const d = new Date();
export default Vue.extend({
    name: 'Home',
    components: {PhotoGrid},
    data: () => ({
        api,
        photosPerMonth: [] as MonthPhotos[],
        photos: [] as Media[][],
        homeElement: {} as HTMLElement,
        canvas: {} as HTMLCanvasElement,
        context: {} as CanvasRenderingContext2D,
        photoGrid: null as any,

        scrollMonthStart: 0,
        scrollLoadPromise: null as Promise<void> | null,
        scrolling: false,
        scrollData: {y: 0, year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate()},
        scrollTimeout: -1,
        prevScroll: -2000,
        scrollThreshold: 4000,

        gettingPhotos: false,
        scrubbing: false,
        scrubTimeout: -1,
        lastScrubTimestamp: -1,
        overScrub: false,
        scrubData: {y: 0, year: d.getFullYear(), month: d.getMonth() + 1},
        maxPhotos: 800,
        initialLoading: true,
        waitPpm: null as null | Promise<{ year: number, month: number, count: number }[]>,
    }),
    beforeDestroy() {
        document.removeEventListener('mousemove', this.scrubMove);
        document.removeEventListener('mouseup', this.scrubEnd);
    },
    async mounted() {
        document.addEventListener('mousemove', this.scrubMove, false);
        document.addEventListener('mouseup', this.scrubEnd, false);

        this.canvas = this.$refs.scrubber as HTMLCanvasElement;
        this.context = this.canvas.getContext('2d') as CanvasRenderingContext2D;
        this.homeElement = (this.$refs.home as HTMLElement);
        this.photoGrid = this.$refs.photoGrid;

        this.waitPpm = this.$store.dispatch('apiRequest', {url: 'photos/months'})
        let photosPerMonth = await this.waitPpm;
        this.photosPerMonth = photosPerMonth.map(({year = 0, month = 0, count = 0}) => ({
            year, month, count, loaded: false
        }));

        if (this.$route.name === 'Home') {
            this.updateFromDateQuery();
        }

        let photos = await this.getPhotos({monthOffset: 0});
        if (this.photos.length === 0) {
            this.photos = photos;
            this.photoGrid.$once('photoRowsUpdate', () => this.$nextTick((() => {
                this.scrollData = this.getScrollData();
            })));
        }
        this.initialLoading = false;
        this.render();
    },
    methods: {
        render() {
            requestAnimationFrame(this.render);
            this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
            let greyedYears = !this.scrubbing && !this.overScrub;
            if (false) this.drawLoadedRegion();
            this.drawYears(greyedYears);
            if (this.overScrub || this.scrubbing) {
                this.drawScrollThumb(
                    this.scrubData.y, this.scrubData.year, this.scrubData.month,
                );
            }
            if (this.scrolling && !this.scrubbing) {
                this.drawScrollThumb(
                    this.scrollData.y, this.scrollData.year, this.scrollData.month,
                    true,
                );
            } else if (!this.scrubbing) {
                this.drawScrollThumb(
                    this.scrollData.y, this.scrollData.year, this.scrollData.month,
                    true,
                    false,
                );
            }
        },
        drawLoadedRegion() {
            let start = 0, regionPart = 0;
            for (let i = 0; i < this.scrollMonthStart; i++) {
                let month = this.photosPerMonth[i];
                start += month.count / this.totalPhotos;
            }
            for (let i = this.scrollMonthStart; i < this.scrollMonthStart + this.scrollMonthLength; i++) {
                let month = this.photosPerMonth[i];
                regionPart += month.count / this.totalPhotos;
            }
            this.context.fillStyle = 'rgba(50,255,100,0.3)';
            let width = 50;
            this.context.fillRect(this.canvas.width - width, start * this.canvas.height, width, regionPart * this.canvas.height);
        },
        drawScrollThumb(y: number, year: number, month: number, smallLine = false, includeText = true) {
            let textSize = 15;
            let boxHeight = textSize + 10 + 3;
            if (y < boxHeight && includeText)
                y = boxHeight;
            let isDark = this.$vuetify.theme.dark as boolean;
            this.context.fillStyle = this.$vuetify.theme.themes[isDark ? 'dark' : 'light'].primary as string;
            let lineWidth = smallLine ? 35 : 50;
            this.context.fillRect(this.canvas.width - lineWidth, y, lineWidth, smallLine ? 2 : 3);
            this.context.fillStyle = 'rgba(255,255,255,0.8)';

            if (includeText) {
                let text = `${monthNames[month - 1]} ${year}`;
                let {width} = this.context.measureText(text);
                this.context.fillRect(this.canvas.width - width - 10, y - textSize - 10,
                    width + 10, textSize + 10);
                this.context.fillStyle = 'black';
                this.context.fillText(text, this.canvas.width - width - 5, y - textSize + 5);
            }
        },
        drawYears(greyedYears = false) {
            this.context.fillStyle = greyedYears ? 'rgba(0,0,0,0.5)' : 'black';
            let y = 0;
            let currentYear = -1;
            let textSize = 12;
            this.context.font = `${textSize}px Roboto`;
            for (let month of this.photosPerMonth) {
                if (month.year !== currentYear) {
                    currentYear = month.year;
                    let text = currentYear.toString();
                    let {width} = this.context.measureText(text);
                    this.context.fillText(text, this.canvas.width - width - 5, y + textSize);
                }
                y += Math.round(month.count / this.totalPhotos * (this.canvas.height - textSize));
            }
        },
        scrubStart(e: MouseEvent) {
            this.scrubbing = true;
            this.scrubByEvent(e);
        },
        scrubMove(e: MouseEvent) {
            let index: number = 0, day: number = 0, month: number = 0, year: number = 0;
            if (this.overScrub || this.scrubbing)
                [index, day, month, year] = this.dateFromScrubEvent(e);
            if (this.scrubbing)
                this.scrub(index, day, month, year);
            if (this.overScrub || this.scrubbing) {
                let y = e.pageY - this.$vuetify.application.top;
                this.scrubData = {y, year, month};
            }
        },
        scrubEnd(e: MouseEvent) {
            if (this.scrubbing) {
                this.scrubbing = false;
                clearTimeout(this.scrubTimeout);
                let [index, day, month, year] = this.dateFromScrubEvent(e);
                this.scrub(index, day, month, year);
            }
        },
        dateFromScrubEvent(e: MouseEvent) {
            let percent = (e.pageY - this.$vuetify.application.top) / (this.$vuetify.breakpoint.height - this.$vuetify.application.top);
            percent = Math.max(0, Math.min(1, percent * 1.01))
            let totalCount = this.totalPhotos;
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
        async scrubByEvent(e: MouseEvent) {
            let [index, day, month, year] = this.dateFromScrubEvent(e);
            await this.scrub(index, day, month, year);
        },
        async scrub(index: number, day: number, month: number, year: number, delay = 300, scroll = true) {
            if (index >= this.scrollMonthStart && index < this.scrollMonthStart + this.scrollMonthLength) {
                console.log('scroll to :', [day, month, year]);
                this.photoGrid.scrollDateIntoView(day, month, year);
                return;
            }

            // pas als je de scrub loslaat of een tijdje niet beweegt moet ie echt scrubben!
            let now = performance.now();
            this.lastScrubTimestamp = now;
            if (delay === 0) {
                await this.loadScrubData(index, day, month, year, scroll);
            } else {
                return new Promise<void>(resolve => {
                    this.scrubTimeout = setTimeout(async () => {
                        // haven't moved in a while
                        if (now === this.lastScrubTimestamp)
                            await this.loadScrubData(index, day, month, year, scroll);
                        resolve();
                    }, delay);
                })
            }
        },
        async loadScrubData(index: number, day: number, month: number, year: number, scroll = true) {
            console.log('scrub to :', [day, month, year]);
            index = Math.max(0, index - 1);
            let monthPhotos = await this.getPhotos({
                monthOffset: index,
                minimumMonths: 2,
            });
            this.scrollMonthStart = index;
            console.log('start', this.scrollMonthStart, 'length', this.scrollMonthLength);
            this.photos = monthPhotos;
            // Prevent scroll event from loading data for 200ms
            // Reason: scroll data isn't accurate right this millisecond
            // because vue needs to put the photos in the html grid
            this.scrollLoadPromise = new Promise(resolve => setTimeout(resolve, 200));
            return new Promise<void>(resolve => {
                this.photoGrid.$once('photoRowsUpdate', () => this.$nextTick(() => {
                    if (scroll) {
                        this.photoGrid.scrollDateIntoView(day, month, year);
                        this.homeScroll();
                    }
                    resolve();
                }));
            })
        },
        getScrollData() {
            let year = d.getFullYear();
            let month = d.getMonth() + 1;
            let day = d.getDate();
            let scrollTop = this.homeElement.scrollTop + 100;
            let rows = this.photoGrid.photoRows;
            if (rows.length === 0)
                return {y: 0, year, month, day};

            let viewedRow = null;
            const marginBottom = 4;
            for (let row of rows) {
                let rowHeight = row[0].height + marginBottom;
                for (let block of row)
                    if (!block.hideDate) {
                        rowHeight += 22;
                        break;
                    }
                scrollTop -= rowHeight;
                if (scrollTop <= 0) {
                    viewedRow = row;
                    break;
                }
            }
            if (viewedRow === null)
                viewedRow = rows[rows.length - 1];

            let date = new Date(viewedRow[0].date);
            month = date.getMonth() + 1;
            year = date.getFullYear();
            day = date.getDate();

            let beforeY = 0;
            for (let i = 0; i < this.scrollMonthStart; i++) {
                let month = this.photosPerMonth[i];
                beforeY += month.count / this.totalPhotos;
            }
            scrollTop = this.homeElement.scrollTop;
            let viewportPart = this.flatPhotos.length / this.totalPhotos;
            let scrollPercentage = (scrollTop + this.homeElement.clientHeight) / this.homeElement.scrollHeight;
            let y = (beforeY + viewportPart * scrollPercentage) * this.canvas.height;
            return {y, year, month, day};
        },
        async homeScroll() {
            this.scrolling = true;
            clearTimeout(this.scrollTimeout);
            this.scrollTimeout = setTimeout(() => this.scrolling = false, 1000);

            this.scrollData = this.getScrollData();

            let scrollTop = this.homeElement.scrollTop;
            // If we haven't scrolled more than 180px since last scroll fire just return
            if (Math.abs(this.prevScroll - scrollTop) < 180)
                return;
            this.prevScroll = scrollTop;

            let scrollBottom = this.homeElement.scrollHeight - scrollTop - this.homeElement.clientHeight;

            if (scrollTop < 3000 || scrollBottom < 3000) {
                let loading = await Promise.race([this.scrollLoadPromise, this.waitSleep(1)]);
                if (!loading)
                    this.scrollLoadPromise = this.loadScrollData(scrollBottom, scrollTop);
            }
        },
        unloadMonths() {
            if (this.flatPhotos.length > this.maxPhotos) {
                let removeNPhotos = this.flatPhotos.length - Math.round(this.maxPhotos / 2);
                let scrollPercent = (this.homeElement.scrollTop + this.homeElement.clientHeight / 2) / this.homeElement.scrollHeight;

                let scrollTop = this.homeElement.scrollTop;
                let scrollBottom = this.homeElement.scrollHeight - scrollTop - this.homeElement.clientHeight;
                console.log(`too many photos! scrollPercent: ${scrollPercent.toFixed(2)}, scrollTop: ${scrollTop}, scrollBottom: ${scrollBottom}`);
                if (scrollPercent < 0.5 && scrollBottom > this.scrollThreshold) {
                    // remove some from bottom
                    let removeNMonths = 0;
                    for (let i = this.scrollMonthStart + this.scrollMonthLength - 1; i >= this.scrollMonthStart; i--) {
                        removeNPhotos -= this.photosPerMonth[i].count;
                        if (removeNPhotos <= 0) break;
                        removeNMonths++;
                    }
                    console.log({removeNMonths});
                    this.photos.splice(this.photos.length - removeNMonths, removeNMonths);
                } else if (scrollPercent >= 0.5 && scrollTop > this.scrollThreshold) {
                    // remove some from top
                    let removeNMonths = 0;
                    for (let i = this.scrollMonthStart; i < this.scrollMonthStart + this.photos.length; i++) {
                        removeNPhotos -= this.photosPerMonth[i].count;
                        if (removeNPhotos <= 0) break;
                        removeNMonths++;
                    }
                    console.log({removeNMonths});
                    this.scrollMonthStart += removeNMonths;
                    this.updatePhotosKeepScroll(() => this.photos.splice(0, removeNMonths));
                }
            }
        },
        async loadScrollData(scrollBottom: number, scrollTop: number) {
            if (scrollTop < this.scrollThreshold && !this.gettingPhotos) {
                let topReached = this.scrollMonthStart === 0;
                if (topReached) return;

                let monthPhotos = await this.getPhotos({
                    monthOffset: this.scrollMonthStart - 1,
                    up: true,
                });
                this.scrollMonthStart -= monthPhotos.length;

                await this.updatePhotosKeepScroll(() => this.photos.unshift(...monthPhotos));
                this.unloadMonths();
            }
            if (scrollBottom < this.scrollThreshold && !this.gettingPhotos) {
                let bottomReached = this.scrollMonthStart + this.scrollMonthLength === this.photosPerMonth.length;
                if (bottomReached) return;

                let monthPhotos = await this.getPhotos({
                    monthOffset: this.scrollMonthStart + this.scrollMonthLength
                });
                this.photos.push(...monthPhotos);
                await this.waitForLayoutUpdate();
                this.unloadMonths();
            }
        },
        async updatePhotosKeepScroll(updateFun: Function) {
            let heightBefore = this.homeElement.scrollHeight ?? 0;
            let topBefore = this.homeElement.scrollTop + this.homeElement.clientHeight;
            updateFun();
            await this.waitForLayoutUpdate();
            let deltaTop = 0;
            let heightAfter = this.homeElement.scrollHeight;
            if (topBefore > heightAfter) {
                deltaTop = topBefore - this.homeElement.scrollTop;
            }
            let addedHeight = heightAfter - heightBefore;
            this.homeElement.scrollBy({
                top: addedHeight + deltaTop,
                left: 0,
            });
        },
        waitForLayoutUpdate(): Promise<void> {
            return new Promise(resolve => {
                this.photoGrid.$once('photoRowsUpdate', () => this.$nextTick(() => {
                    resolve();
                }));
            })
        },
        async getPhotos({requestMinimum = 50, monthOffset = 0, minimumMonths = 0, up = false}): Promise<Media[][]> {
            this.gettingPhotos = true;
            // Get's at least 100 photos based on given start month/year
            let requestedMonths = [];
            for (let i = monthOffset; up ? i >= 0 : i < this.photosPerMonth.length; i += up ? -1 : 1) {
                let month = this.photosPerMonth[i];
                requestedMonths.push(month);
                requestMinimum -= month.count;
                if (requestMinimum < 0 && requestedMonths.length >= minimumMonths)
                    break;
            }
            console.log("Requesting months", requestedMonths.map(m => [m.year, m.month].join(', ')));
            let photos = await this.$store.dispatch('apiRequest', {
                url: 'photos/month-photos',
                body: {months: requestedMonths.map(m => [m.year, m.month])}
            });
            if (up) photos = photos.reverse();
            this.gettingPhotos = false;
            return photos.map((p: Object[]) => p.map(Media.fromObject));
        },
        async scrubIntoView(media: Media | null) {
            if (media === null)
                return;
            await this.waitPpm;
            await this.scrubToDate(media.createDate, false);
            this.photoGrid.scrollMediaIntoView(media);
            setTimeout(() => {
                this.photoGrid.scrollMediaIntoView(media);
                this.homeScroll();
            }, 500);
        },
        async scrubToDate(date: Date, scroll = true) {
            await this.waitPpm;

            let day = date.getDate();
            let month = date.getMonth() + 1;
            let year = date.getFullYear();
            let target = year * 12 + (month - 1);
            let closest = Infinity;
            let index = -1;
            for (let i = 0; i < this.photosPerMonth.length; i++) {
                let m = this.photosPerMonth[i];
                if (m.month === month && m.year === year) {
                    index = i;
                    break;
                }
                let value = m.year * 12 + (m.month - 1);
                let distance = Math.abs(value - target);
                if (distance < closest) {
                    closest = distance;
                    index = i;
                } else {
                    break;
                }
            }
            if (index === -1)
                return console.warn('cant keep in view, date', date, 'not in photosPerMonth', this.photosPerMonth);

            await this.scrub(index, day, month, year, 0, scroll);
        },
        updateFromDateQuery() {
            if (this.$route.query.date === undefined || this.$route.query.date === null) return;
            console.log('date string', this.$route.query.date as string);
            let date = new Date(this.$route.query.date as string);
            if (isNaN(date.getDate())) return;
            this.scrubToDate(date);
            console.log("home date changed", date);
        },
        waitSleep(ms = 1000) {
            return new Promise(resolve => setTimeout(resolve, ms));
        },
    },
    computed: {
        topLoaded(): boolean {
            return this.scrollMonthStart === 0;
        },
        bottomLoaded(): boolean {
            return this.scrollMonthStart + this.scrollMonthLength === this.photosPerMonth.length;
        },
        scrollMonthLength(): number {
            return this.photos.length;
        },
        flatPhotos(): Media[] {
            return this.photos.flat();
        },
        canvasHeight(): number {
            return this.$vuetify.breakpoint.height - this.$vuetify.application.top - this.$vuetify.application.bottom;
        },
        totalPhotos(): number {
            let n = 0;
            for (let month of this.photosPerMonth)
                n += month.count;
            return n;
        },
    },
    watch: {
        '$route.query.date'() {
            this.updateFromDateQuery();
        },
        '$store.state.keepInView'() {
            this.scrubIntoView(this.$store.state.keepInView);
        },
        '$store.state.scrollToTop'() {
            if (!this.$store.state.scrollToTop)
                return;
            if (this.photosPerMonth.length === 0) return;
            let {month, year} = this.photosPerMonth[0];
            this.scrub(0, 1, month, year);
            this.$store.commit('scrollToTop', false);
        },
        flatPhotos() {
            this.$store.commit('viewerQueue', this.flatPhotos);
        },
    }
})
</script>

<style scoped>
.home {
    padding: 10px 10px 10px 10px;
    max-height: calc(100vh - 64px);
    overflow-y: scroll;
    width: 100%;
    -ms-overflow-style: none;
    scrollbar-width: none;
}

.home::-webkit-scrollbar {
    display: none;
}

.progress-center {
    display: flex;
    width: 100%;
    padding: 20px;
    align-items: center;
    justify-content: center;
    height: calc(80vh - 64px);
}

.no-results {
    display: flex;
    width: 100%;
    height: 70%;
    place-content: center;
    flex-direction: column;
    text-align: center;
}

.no-results .icon {
    font-size: 40vw !important;
    opacity: 0.3;
}

.no-results .caption {
    font-size: 3vw !important;
    opacity: 0.8;
}

.grid {
    width: calc(100% - 40px);
    position: relative;
    left: 0;
    bottom: 0;
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
    bottom: 0;
}

.scrubber-canvas {
    pointer-events: none;
}
</style>
