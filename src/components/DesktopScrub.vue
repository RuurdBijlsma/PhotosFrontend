<template>
    <div class="scrubber">
        <canvas :width="100"
                :height="canvasHeight"
                :style="{height: canvasHeight + 'px'}"
                ref="scrubber" class="inner-scrub scrubber-canvas"/>
        <div class="inner-scrub scrubber-events"
             :style="{height: canvasHeight + 'px'}"
             @mouseenter="overScrub=true"
             @mouseleave="overScrub=false"
             @touchstart="touchScrubStart"
             @mousedown="scrubStart"/>
    </div>
</template>

<script lang="ts">
import Vue, {PropType} from 'vue'
import {shortMonths} from "@/ts/constants";
import {MonthPhotos} from "@/ts/MediaInterfaces";

const d = new Date();
export default Vue.extend({
    name: 'DesktopScrub',
    props: {
        homeId: {type: String, required: true},
        photosPerMonth: {type: Array as PropType<MonthPhotos[]>, required: true},
        indexInView: {type: Number, required: true},
    },
    data: () => ({
        homeElement: {} as HTMLElement,
        canvas: {} as HTMLCanvasElement,
        context: {} as CanvasRenderingContext2D,
        yearTextSize: 13,
        renderAnimationFrame: -1,
        scrollTimeout: -1,
        scrolling:false,
        scrubbing: false,
        overScrub: false,
        scrubData: {percent: 0, year: d.getFullYear(), month: d.getMonth() + 1},
    }),
    beforeDestroy() {
        cancelAnimationFrame(this.renderAnimationFrame);
        document.removeEventListener('mousemove', this.scrubMove);
        document.removeEventListener('mouseup', this.scrubEnd);
        document.removeEventListener('touchmove', this.touchScrubMove);
        document.removeEventListener('touchend', this.scrubEnd);
        this.homeElement.removeEventListener('scroll', this.homeScroll);
    },
    async mounted() {
        this.homeElement = document.querySelector(`#${this.homeId}`) as HTMLElement;
        document.addEventListener('mousemove', this.scrubMove, false);
        document.addEventListener('mouseup', this.scrubEnd, false);
        document.addEventListener('touchmove', this.touchScrubMove, false);
        document.addEventListener('touchend', this.scrubEnd, false);
        this.homeElement.addEventListener('scroll', this.homeScroll, false);

        this.canvas = this.$refs.scrubber as HTMLCanvasElement;
        this.context = this.canvas.getContext('2d') as CanvasRenderingContext2D;

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
            for (let i = 0; i < this.photosPerMonth.length; i++) {
                y -= this.photosPerMonth[i].height;
                if (y <= 0)
                    return this.photosPerMonth[i];
            }
            return this.photosPerMonth[this.photosPerMonth.length - 1];
        },
        dateFromScrubEvent(pageY: number): number {
            let percent = (pageY - this.$vuetify.application.top) / this.canvas.height;
            percent = Math.max(0, Math.min(1, percent * 1.01));
            return percent;
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
        touchScrubStart(e: TouchEvent) {
            this.scrubbing = true;
            let percent = this.dateFromScrubEvent(e.touches[0].pageY);
            this.homeElement.scrollTo({top: this.homeElement.scrollHeight * percent});
        },
        touchScrubMove(e: TouchEvent) {
            if (this.scrubbing) {
                let percent = this.dateFromScrubEvent(e.touches[0].pageY);
                this.homeElement.scrollTo({top: this.homeElement.scrollHeight * percent});
            }
        },
        scrubStart(e: MouseEvent) {
            this.scrubbing = true;
            let percent = this.dateFromScrubEvent(e.pageY);
            this.homeElement.scrollTo({top: this.homeElement.scrollHeight * percent});
        },
        scrubMove(e: MouseEvent) {
            if (this.scrubbing) {
                let percent = this.dateFromScrubEvent(e.pageY);
                this.homeElement.scrollTo({top: this.homeElement.scrollHeight * percent});
            }
            if (this.overScrub || this.scrubbing) {
                let y = e.pageY - this.$vuetify.application.top;
                let mp = this.yToMonthPhotos(y / this.canvas.height);
                this.scrubData = {percent: y / this.canvas.height, year: mp.year, month: mp.month};
            }
        },
        scrubEnd() {
            if (this.scrubbing) {
                this.scrubbing = false;
            }
        },
    },
    computed: {
        canvasHeight(): number {
            return this.$vuetify.breakpoint.height - this.$vuetify.application.top - this.$vuetify.application.bottom;
        },
    },
    watch: {
    },
})
</script>

<style scoped>
.scrubber{
    width: 100px;
    height: 100%;
    position: absolute;
    right: 0;
    top: 0;
}
.inner-scrub {
    width: 100%;
    height: 100%;
    position: absolute;
    right: 0;
}

.scrubber-events {
    width: 50px !important;
    cursor: pointer;
}

.scrubber-canvas {
    pointer-events: none;
}
</style>
