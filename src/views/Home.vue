<template>
    <div class="home" ref="frame">
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
// dont start new day on very narrow space
import Vue from 'vue'

export default Vue.extend({
    name: 'Home',
    data: () => ({
        photoRows: [] as any[][],
        photosPerMonth: [] as any[],
        api: "http://localhost:3000",
        frameWidth: window.innerWidth - 256,
    }),
    beforeDestroy() {
        window.removeEventListener('resize', this.updateFrameWidth);
    },
    async mounted() {
        this.photosPerMonth = await fetch(`${this.api}/photos/months`).then(t => t.json());
        this.updateFrameWidth();
        await this.getPhotos();
        window.addEventListener('resize', this.updateFrameWidth, false);
    },
    methods: {
        async getPhotos() {
            // Get's at least 100 photos based on given start month/year
            let requestMinimum = 100;
            const startMonthIndex = 0;
            let requestedMonths = [];
            for (let i = startMonthIndex; i < this.photosPerMonth.length; i++) {
                let month = this.photosPerMonth[i];
                requestedMonths.push(month);
                requestMinimum -= month.count;
                if (requestMinimum < 0)
                    break;
            }
            let photos = await fetch(
                `${this.api}/photos/month-photos`,
                {
                    method: "POST",
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(requestedMonths.map(m => [m.year, m.month]))
                }
            ).then(j => j.json()).then(j => j.flat());
            console.log(this.photosPerMonth);
            console.log(photos);

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

            // Calculate visual size for photos given viewport size
            const padding = 10;
            const scrollDomheid = 17;
            const allowedWidth = this.frameWidth - padding * 2 - scrollDomheid;
            console.log({allowedWidth})
            const minHeight = 170 + Math.max(window.innerWidth / 40, 20);
            let rows: any[][] = [];
            let row = [];
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
                            console.log(remainingWidth);
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
                console.log(sizeMultiplier);
                if (sizeMultiplier > 1.8) {
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
    },
    computed: {},
})
</script>

<style scoped>
.home {
    padding: 10px 10px 10px 10px;
    max-height: calc(100vh - 64px);
    overflow-y: auto;
}

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
