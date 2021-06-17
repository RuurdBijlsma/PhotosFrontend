<template>
    <div class="mobile-scrub" :style="{
        opacity: scrolling ? 1 : 0,
        pointerEvents: scrolling ? 'all' : 'none',
        height: tabSize + 'px',
        top: topCss,
    }">
        <div class="scrub-container">
            <v-sheet rounded class="scrub-date">{{ formattedDate }}</v-sheet>
            <v-sheet elevation="7"
                     class="scrub-tab"
                     @touchstart="touchScrubStart"
                     @mousedown="scrubStart"
                     :style="{
                    width: tabSize + 'px',
                    height: tabSize + 'px',
                 }">
                <v-icon>mdi-unfold-more-horizontal</v-icon>
            </v-sheet>
        </div>
    </div>
</template>

<script lang="ts">
import Vue, {PropType} from 'vue'
import {MonthPhotos} from "@/ts/MediaInterfaces";
import {format} from 'date-fns'

export default Vue.extend({
    name: 'MobileScrub',
    props: {
        homeId: {type: String, required: true},
        photosPerMonth: {type: Array as PropType<MonthPhotos[]>, required: true},
        indexInView: {type: Number, required: true},
    },
    data: () => ({
        tabSize: 50,

        homeElement: {} as HTMLElement,
        scrollTimeout: -1,
        scrolling: true,
        scrubbing: false,
        overScrub: false,
        scrollTop: 0,
        scrollHeight: 100,
    }),
    beforeDestroy() {
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
        this.scrollTimeout = setTimeout(() => this.scrolling = false, 3000);
    },
    methods: {
        updateScrollData() {
            this.scrollTop = this.homeElement.scrollTop;
            this.scrollHeight = this.homeElement.scrollHeight;
        },
        homeScroll() {
            this.scrolling = true;
            clearTimeout(this.scrollTimeout);
            this.scrollTimeout = setTimeout(() => this.scrolling = false, 3000);
            this.updateScrollData();
        },
        yToMonthPhotos(percentage: number) {
            let y = percentage * this.scrollHeight;
            for (let i = 0; i < this.photosPerMonth.length; i++) {
                y -= this.photosPerMonth[i].height;
                if (y <= 0)
                    return this.photosPerMonth[i];
            }
            return this.photosPerMonth[this.photosPerMonth.length - 1];
        },
        dateFromScrubEvent(pageY: number): number {
            let percent = (pageY - this.$vuetify.application.top - this.tabSize / 2) /
                (this.canvasHeight - this.tabSize);
            percent = Math.max(0, Math.min(1, percent * 1.01));
            return percent;
        },
        touchScrubStart(e: TouchEvent) {
            this.scrubbing = true;
            let percent = this.dateFromScrubEvent(e.touches[0].pageY);
            this.homeElement.scrollTo({top: this.scrollHeight * percent});
        },
        touchScrubMove(e: TouchEvent) {
            if (this.scrubbing) {
                let percent = this.dateFromScrubEvent(e.touches[0].pageY);
                this.homeElement.scrollTo({top: this.scrollHeight * percent});
            }
        },
        scrubStart(e: MouseEvent) {
            this.scrubbing = true;
            let percent = this.dateFromScrubEvent(e.pageY);
            this.homeElement.scrollTo({top: this.scrollHeight * percent});
        },
        scrubMove(e: MouseEvent) {
            if (this.scrubbing) {
                let percent = this.dateFromScrubEvent(e.pageY);
                this.homeElement.scrollTo({top: this.scrollHeight * percent});
            }
        },
        scrubEnd() {
            if (this.scrubbing)
                this.scrubbing = false;
        },
    },
    computed: {
        scrubData(): { percent: number, year: number, month: number } {
            let percent = this.scrollTop / this.scrollHeight;
            let mp = this.yToMonthPhotos(percent);
            return {
                percent,
                year: mp.year,
                month: mp.month,
            };
        },
        topCss(): string {
            let pixels = Math.round((this.canvasHeight - this.tabSize) * this.scrubData.percent);
            return `${pixels}px`;
        },
        formattedDate(): string {
            return format(new Date(this.scrubData.year, this.scrubData.month, 15), 'MMM yyyy')
        },
        canvasHeight(): number {
            return this.$vuetify.breakpoint.height - this.$vuetify.application.top - this.$vuetify.application.bottom;
        },
    },
    watch: {},
})
</script>

<style scoped>

.mobile-scrub {
    position: absolute;
    top: 0;
    right: -12px;
    z-index: 5;
    transition: opacity 0.2s;
}

.scrub-container {
    display: flex;
    align-items: center;
}

.scrub-date {
    padding: 5px 10px;
    font-weight: 500;
    white-space: nowrap;
    font-size: 14px;
    margin-right: 5px;
}

.scrub-tab {
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
}
</style>
