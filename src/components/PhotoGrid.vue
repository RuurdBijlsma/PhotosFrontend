<template>
    <div class="photo-grid" ref="frame">
        <div class="block-row" v-for="row in photoRows">
            <div class="photo-block" v-for="block in row">
                <div class="block-day" :title="block.day" :class="{'hide-date':block.hideDate}"
                     :style="{maxWidth: block.width + 'px'}">
                    {{ block.day }}
                </div>
                <div class="photos">
                    <div class="photo" v-for="photo in block.photos"
                         :style="{
                        height: photo.visualHeight + 'px',
                        width: photo.visualWidth + 'px',
                     }">
                        <div v-if="photo.type === 'image'"
                             :style="{
                        backgroundImage: `url(${api}/photo/small/${photo.id}.webp)`
                     }"
                             :src="`${api}/photo/small/${photo.id}.webp`"
                             :alt="photo.filename"></div>
                        <video @mouseleave="pauseVideo(photo.id)"
                               @mouseenter="playVideo(photo.id)"
                               :poster="`${api}/photo/small/${photo.id}.webp`"
                               muted loop
                               :ref="`video${photo.id}`" v-else
                               :src="`${api}/photo/webm/${photo.id}.webm`"></video>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts">
//TODO
// Get actual viewport with excluding scrollbar
// Separate functions
// Separate into vue component
// Update layout on window resize
import Vue from 'vue'
import {api} from "@/ts/constants"

export default Vue.extend({
    name: 'PhotoGrid',
    props: {
        photos: {
            type: Array,
            required: true,
        },
    },
    data: () => ({
        photoRows: [] as any[][],
        frameWidth: window.innerWidth - 256,
        api,
        unshifting: false,
    }),
    beforeDestroy() {
        window.removeEventListener('resize', this.onResize);
    },
    async mounted() {
        this.updateFrameWidth();
        await this.calculateLayout();
        window.addEventListener('resize', this.onResize, false);
    },
    methods: {
        async calculateLayout() {
            let photos = this.photos as any[];
            if (photos.length === 0) {
                this.photoRows = [];
                return;
            }
            this.updateFrameWidth();

            // Batch photos by day
            const currentYear = new Date().getFullYear();
            const currentDate = new Date().toDateString();
            const yesterday = new Date(new Date().getTime() - 1000 * 60 * 60 * 24).toDateString()
            const getDateString = (date: string) => {
                let d = new Date(date);
                let ds = d.toDateString();
                if (ds === currentDate)
                    return 'Today';
                if (ds === yesterday)
                    return 'Yesterday';
                if (d.getFullYear() === currentYear)
                    return ds.substr(0, ds.length - 5);
                else return ds;
            }
            let firstDay = getDateString(photos[0].createDate);
            let photosByDay = [];
            let dayPhotos: { day: string, photos: any[] } = {day: firstDay, photos: []};
            for (let photo of photos) {
                let photoDay = getDateString(photo.createDate);
                if (dayPhotos.day !== photoDay) {
                    photosByDay.push(dayPhotos);
                    dayPhotos = {day: photoDay, photos: []};
                }
                dayPhotos.photos.push(photo);
            }
            photosByDay.push(dayPhotos);


            // Calculate visual size for photos given viewport size
            const allowedWidth = this.frameWidth;
            const minHeight = 150 + Math.min(window.innerWidth / 30, 64);
            let rows: any[][] = [];
            let row: any[] = [];
            let block: { photos: any[], day: string, width: number, hideDate: boolean } = {
                photos: [],
                day: firstDay,
                width: 0,
                hideDate: false,
            };
            let rowW = 0;
            let prevDaySize = 0
            for (let dayPhotos of photosByDay) {
                let day = dayPhotos.day;
                for (let photo of dayPhotos.photos) {
                    photo.ratio = photo.width / photo.height;
                    let preferredWidth = minHeight * photo.ratio;
                    let updatedWidth = rowW + preferredWidth;
                    let remainingWidth = allowedWidth - rowW;
                    let currentDaySize = dayPhotos.photos.length;

                    // If this photo doesn't fit in the block, or it's a different day, make new block
                    let newDay = day !== block.day;
                    let newRow = updatedWidth > allowedWidth ||
                        (newDay && remainingWidth - preferredWidth < 100) ||
                        (newDay && currentDaySize > 3) ||
                        (newDay && prevDaySize > 3)
                    if (newRow || newDay) {
                        if (block.photos.length > 0)
                            row.push(block);
                        block = {photos: [], day: day, width: 0, hideDate: newRow && !newDay};

                        if (newRow) {
                            if (row.length > 0)
                                rows.push(row);
                            row = [];
                            rowW = 0;
                        }
                    }
                    rowW += preferredWidth;
                    block.photos.push(photo);
                }
                prevDaySize = dayPhotos.photos.length;
            }
            row.push(block);
            rows.push(row);


            const imageMargin = 5;
            const blockMargin = 40;
            for (let row of rows) {
                let blockWidths = [];
                for (let block of row) {
                    block.width = block.photos
                        .map((p: any) => p.ratio * minHeight)
                        .reduce((a: number, b: number) => a + b);
                    blockWidths.push(block.width);
                }
                let pixelWidth = blockWidths.reduce((a, b) => a + b);
                let imageMargins = row.map(block => (block.photos.length - 1) * imageMargin);
                let blockMargins = (row.length - 1) * blockMargin;
                let margins = imageMargins.reduce((a, b) => a + b) + blockMargins;
                let sizeMultiplier = (allowedWidth - margins) / pixelWidth;
                if (sizeMultiplier > 2) {
                    sizeMultiplier = 1;
                }
                // sizeMultiplier = 1;
                // sizeMultiplier = Math.min(sizeMultiplier, 1.5);
                for (let block of row) {
                    for (let photo of block.photos) {
                        photo.visualHeight = minHeight * sizeMultiplier;
                        photo.visualWidth = minHeight * photo.ratio * sizeMultiplier;
                    }
                }
            }

            this.photoRows = rows;
        },
        onResize() {
            requestAnimationFrame(this.calculateLayout);
        },
        updateFrameWidth() {
            this.frameWidth = (this.$refs.frame as HTMLElement).clientWidth;
        },
        playVideo(id: string) {
            let video: HTMLVideoElement = (this.$refs['video' + id] as HTMLVideoElement[])?.[0];
            video?.play?.();
        },
        pauseVideo(id: string) {
            let video: HTMLVideoElement = (this.$refs['video' + id] as HTMLVideoElement[])?.[0];
            video?.pause?.();
        },
        prepareUnshift() {
            this.unshifting = true;
        },
    },
    computed: {},
    watch: {
        photos() {
            if (this.unshifting) {
                this.unshifting = false;
                let home = document.querySelector('.home');
                let heightBefore = home?.scrollHeight ?? 0;
                this.calculateLayout();
                this.$nextTick(() => {
                    let addedHeight = (home?.scrollHeight ?? 0) - heightBefore;
                    console.log(addedHeight, heightBefore, home?.scrollHeight);
                    home?.scrollBy({
                        top: addedHeight,
                        left: 0,
                    });
                })
            } else {
                requestAnimationFrame(this.calculateLayout);
            }
        }
    }
})
</script>

<style scoped>
.photo-block {
    display: inline-block;
    margin-right: 40px;
}

.photo-block:last-child {
    margin-right: 0;
}

.block-day {
    margin: 10px 0;
    font-weight: 500;
    font-size: 15px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.block-day.hide-date {
    opacity: 0;
    height: 0;
    margin: 0;
}

.photo {
    display: inline-block;
    margin-right: 5px;
    margin-bottom: -3px;
}

.photo:last-child {
    margin-right: 0;
}

.photo > div {
    background-size: contain;
    background-position: center;
    background-repeat: no-repeat;
}

.photo > * {
    width: 100%;
    height: 100%;
}
</style>
