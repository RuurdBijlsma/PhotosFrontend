<template>
    <div class="mobile-scrub" :style="{
        opacity: scrolling ? 1 : 0,
        pointerEvents: scrolling ? 'all' : 'none',
        height: tabSize + 'px',
        top: topCss,
    }">
        <div class="scrub-container">
            <span class="scrub-date">{{ formattedDate }}</span>
            <v-sheet elevation="7"
                     class="scrub-tab"
                     @touchstart="scrubStart"
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
        scrolling: false,
        scrubbing: false,
        overScrub: false,
        scrollTop: 0,
        scrollHeight: 100,
    }),
    beforeDestroy() {
        document.removeEventListener('touchmove', this.scrubMove);
        document.removeEventListener('touchend', this.scrubEnd);
        this.homeElement.removeEventListener('scroll', this.homeScroll);
    },
    async mounted() {
        this.homeElement = document.querySelector(`#${this.homeId}`) as HTMLElement;
        document.addEventListener('touchmove', this.scrubMove, false);
        document.addEventListener('touchend', this.scrubEnd, false);
        this.homeElement.addEventListener('scroll', this.homeScroll, false);
    },
    methods: {
        updateScrollData() {
            this.scrollTop = this.homeElement.scrollTop;
            this.scrollHeight = this.homeElement.scrollHeight;
        },
        homeScroll() {
            this.scrolling = true;
            clearTimeout(this.scrollTimeout);
            this.scrollTimeout = setTimeout(() => this.scrolling = false, 1000);
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
        dateFromScrubEvent(e: TouchEvent): number {
            let percent = (e.touches[0].pageY - this.$vuetify.application.top - this.tabSize / 2) /
                (this.canvasHeight - this.tabSize);
            percent = Math.max(0, Math.min(1, percent * 1.01));
            return percent;
        },
        scrubStart(e: TouchEvent) {
            this.scrubbing = true;
            let percent = this.dateFromScrubEvent(e);
            this.homeElement.scrollTo({top: this.scrollHeight * percent});
        },
        scrubMove(e: TouchEvent) {
            if (this.scrubbing) {
                let percent = this.dateFromScrubEvent(e);
                this.homeElement.scrollTo({top: this.scrollHeight * percent});
            }
        },
        scrubEnd() {
            if (this.scrubbing) {
                this.scrubbing = false;
            }
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
    background-color: rgba(255, 255, 255, 0.8);
    padding: 5px 10px;
    border-radius: 5px;
    font-weight: 500;
    white-space: nowrap;
    font-size: 14px;
}

.scrub-tab {
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
}
</style>
