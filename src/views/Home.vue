<template>
    <div class="home" ref="home" @scroll="homeScroll">
        <photo-grid timeline ref="photoGrid" class="grid"
                    :photos="photos"></photo-grid>

        <canvas :width="100"
                :height="canvasHeight"
                ref="scrubber" class="scrubber"/>
        <div class="scrubber scrubber-events"
             @mouseenter="overScrub=true"
             @mouseleave="overScrub=false"
             @mousedown="scrubStart"/>
    </div>
</template>

<script lang="ts">
//TODO
// Scrolling sometimes loads new data twice when only once is supposed to happen
// if too much is loaded remove far away pictures
// scrubbing to last date in list removes scrollbar >:(
// search might return too many results for one page :hmm not sure
//      Google photos uses limit+offset for this
// it's possible to scrub to an exact border and scroll up won't work

// Add settings page
// click photo to view it large
// albums
// world with photos
// explore page with location tags and label tags
// show logged in state in app bar
// Delete photo
// Upload photo
// Download photo

const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',];
import Vue from 'vue'
import PhotoGrid from "@/components/PhotoGrid.vue";
import {api} from "@/ts/constants"

const d = new Date();
export default Vue.extend({
    name: 'Home',
    components: {PhotoGrid},
    data: () => ({
        photosPerMonth: [] as any[],
        photos: [] as any[],
        api,
        homeElement: {} as HTMLElement,
        photoGrid: null as any,
        scrollMonthStart: 0,
        scrollMonthLength: 0,
        gettingPhotos: false,
        scrollLoadPromise: null as any,
        scrubbing: false,
        canvas: {} as HTMLCanvasElement,
        context: {} as CanvasRenderingContext2D,
        scrubTimeout: -1,
        lastScrubTimestamp: -1,
        overScrub: false,
        scrubData: {y: 0, year: d.getFullYear(), month: d.getMonth() + 1},
        scrolling: false,
        scrollData: {y: 0, year: d.getFullYear(), month: d.getMonth() + 1},
        scrollTimeout: -1,
        prevScroll: -2000,
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

        this.photosPerMonth = await this.$store.dispatch('apiRequest', {url: 'photos/months'});
        let [photos, newMonths] = await this.getPhotos({monthOffset: 0});
        this.photos = photos;
        this.scrollMonthLength = newMonths;
        this.homeElement = (this.$refs.home as HTMLElement);
        this.photoGrid = this.$refs.photoGrid;
        this.render();

        this.photoGrid.$once('photoRowsUpdate', () => this.$nextTick((() => {
            this.scrollData = this.getScrollData();
        })));
    },
    methods: {
        render() {
            requestAnimationFrame(this.render);
            this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
            let greyedYears = !this.scrubbing && !this.overScrub;
            this.drawLoadedRegion();
            this.drawYears(greyedYears);
            if (this.overScrub || this.scrubbing) {
                this.drawScrollThumb(
                    this.scrubData.y, this.scrubData.year, this.scrubData.month,
                );
            }
            if (this.scrolling) {
                this.drawScrollThumb(
                    this.scrollData.y, this.scrollData.year, this.scrollData.month,
                    true,
                );
            } else {
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
        async scrub(index: number, day: number, month: number, year: number) {
            if (index >= this.scrollMonthStart && index < this.scrollMonthStart + this.scrollMonthLength) {
                console.log('scroll to :', [day, month, year]);
                this.photoGrid.scrollIntoView(day, month, year);
                return;
            }

            // pas als je de scrub loslaat of een tijdje niet beweegt moet ie echt scrubben!
            let now = performance.now();
            this.lastScrubTimestamp = now;
            this.scrubTimeout = setTimeout(() => {
                // haven't moved in a while
                if (now === this.lastScrubTimestamp)
                    this.loadScrubData(index, day, month, year);
            }, 300);
        },
        async loadScrubData(index: number, day: number, month: number, year: number) {
            console.log('scrub to :', [day, month, year]);
            let [photos, newMonths] = await this.getPhotos({
                monthOffset: Math.max(0, index)
            });
            this.scrollMonthStart = index;
            this.scrollMonthLength = newMonths;
            console.log('start', this.scrollMonthStart, 'length', this.scrollMonthLength);
            this.photos = photos;
            // Prevent scroll event from loading data for 200ms
            // Reason: scroll data isn't accurate right this millisecond
            // because vue needs to put the photos in the html grid
            this.scrollLoadPromise = new Promise(resolve => setTimeout(resolve, 200));
            this.photoGrid.$once('photoRowsUpdate', () => this.$nextTick(() => {
                this.photoGrid.scrollIntoView(day, month, year);
            }));
        },
        getScrollData() {
            let year = d.getFullYear();
            let month = d.getMonth() + 1;
            let scrollTop = this.homeElement.scrollTop + 100;
            let rows = this.photoGrid.photoRows;
            if (rows.length === 0)
                return {y: 0, year, month};

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

            let beforeY = 0;
            for (let i = 0; i < this.scrollMonthStart; i++) {
                let month = this.photosPerMonth[i];
                beforeY += month.count / this.totalPhotos;
            }
            scrollTop = this.homeElement.scrollTop;
            let viewportPart = this.photos.length / this.totalPhotos;
            let scrollPercentage = (scrollTop + this.homeElement.clientHeight) / this.homeElement.scrollHeight;
            let y = (beforeY + viewportPart * scrollPercentage) * this.canvas.height;
            return {y, year, month};
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
                await this.scrollLoadPromise;
                this.scrollLoadPromise = this.loadScrollData(scrollBottom, scrollTop);
            }
        },
        async loadScrollData(scrollBottom: number, scrollTop: number) {
            if (scrollTop < 3000 && !this.gettingPhotos) {
                let topReached = this.scrollMonthStart === 0;
                if (topReached) return;

                let [photos, newMonths] = await this.getPhotos({
                    monthOffset: this.scrollMonthStart - 1,
                    up: true,
                });
                this.scrollMonthStart -= newMonths;
                this.scrollMonthLength += newMonths;

                let home = this.$refs.home as HTMLElement;
                let heightBefore = home.scrollHeight ?? 0;
                this.photos.unshift(...photos);
                this.photoGrid.$once('photoRowsUpdate', () => this.$nextTick(() => {
                    let addedHeight = (home.scrollHeight ?? 0) - heightBefore;
                    home.scrollBy({
                        top: addedHeight,
                        left: 0,
                    });
                }));
            }
            if (scrollBottom < 3000 && !this.gettingPhotos) {
                let bottomReached = this.scrollMonthStart + this.scrollMonthLength === this.photosPerMonth.length;
                if (bottomReached) return;

                let [photos, newMonths] = await this.getPhotos({
                    monthOffset: this.scrollMonthStart + this.scrollMonthLength
                });
                this.scrollMonthLength += newMonths;
                this.photos.push(...photos);
            }
        },
        async getPhotos({requestMinimum = 150, monthOffset = 0, up = false}) {
            this.gettingPhotos = true;
            // Get's at least 100 photos based on given start month/year
            let requestedMonths = [];
            for (let i = monthOffset; up ? i >= 0 : i < this.photosPerMonth.length; i += up ? -1 : 1) {
                let month = this.photosPerMonth[i];
                requestedMonths.push(month);
                requestMinimum -= month.count;
                if (requestMinimum < 0)
                    break;
            }
            console.log("Requesting months", requestedMonths.map(m => [m.year, m.month].join(', ')));
            let photos = await this.$store.dispatch('apiRequest', {
                url: 'photos/month-photos',
                body: {months: requestedMonths.map(m => [m.year, m.month])}
            });
            if (up)
                photos = photos.reverse();
            this.gettingPhotos = false;
            return [photos.flat(), requestedMonths.length];
        }
    },
    computed: {
        canvasHeight() {
            return this.$vuetify.breakpoint.height - this.$vuetify.application.top - this.$vuetify.application.bottom;
        },
        totalPhotos() {
            let n = 0;
            for (let month of this.photosPerMonth)
                n += month.count;
            return n;
        },
    },
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
</style>
