<template>
    <div class="photo-grid" ref="frame">
        <div class="block-row" v-for="row in photoRows" ref="rows">
            <div class="photo-block" v-for="block in row">
                <div class="block-day" :title="block.day" :class="{'hide-date':block.hideDate}"
                     :style="{maxWidth: Math.floor(block.width) + 'px'}">
                    {{ block.day }}
                </div>
                <div class="photos">
                    <router-link class="photo"
                                 :to="`${currentPath}/photo/${media.id}`"
                                 v-for="{media, visualWidth, visualHeight} in block.layoutMedias"
                                 :key="media.id"
                                 :style="{
                        height: visualHeight + 'px',
                        width: visualWidth + 'px',
                     }">
                        <div v-if="media.type === 0"
                             :style="{
                                backgroundImage: `url(${api}/photo/small/${media.id}.webp)`
                             }"
                             :alt="media.filename"></div>
                        <video @mouseleave="pauseVideo(media.id)"
                               @mouseenter="playVideo(media.id)"
                               :poster="`${api}/photo/small/${media.id}.webp`"
                               muted loop
                               :ref="`video${media.id}`" v-else
                               :src="`${api}/photo/webm/${media.id}.webm`"></video>
                    </router-link>
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts">
import Vue, {PropType} from 'vue'
import {api} from "@/ts/constants"
import {ILayoutBlock} from "@/ts/ILayoutBlock";
import {Media} from "@/ts/Media";
import {ILayoutMedia} from "@/ts/ILayoutMedia";

export default Vue.extend({
    name: 'PhotoGrid',
    props: {
        photos: {type: Array as PropType<Media[]>, required: true},
        timeline: {type: Boolean, default: false},
    },
    data: () => ({
        photoRows: [] as ILayoutBlock[][],
        frameWidth: window.innerWidth - 256,
        api,
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
            let photos: ILayoutMedia[] = this.photos.map(p => ({media: p, visualWidth: 0, visualHeight: 0}));
            if (photos.length === 0) {
                this.photoRows = [];
                return;
            }
            this.updateFrameWidth();

            // Batch photos by day
            const currentYear = new Date().getFullYear();
            const currentDate = new Date().toDateString();
            const yesterday = new Date(new Date().getTime() - 1000 * 60 * 60 * 24).toDateString()
            const parseDate = (date: Date): [string, number, number] => {
                let ds = date.toDateString();
                let month = date.getMonth() + 1;
                let unix = date.getTime();
                if (ds === currentDate)
                    return ['Today', month, unix];
                if (ds === yesterday)
                    return ['Yesterday', month, unix];
                if (date.getFullYear() === currentYear)
                    return [ds.substr(0, ds.length - 5), month, unix];
                else return [ds, month, unix];
            }
            let [firstDay, firstMonth, firstDate] = parseDate(photos[0].media.createDate);

            interface DayPhotos {
                day: string,
                month: number,
                layoutMedias: ILayoutMedia[],
                date: number,
            }

            let dayPhotos: DayPhotos = {
                day: firstDay,
                month: firstMonth,
                date: firstDate,
                layoutMedias: [],
            };
            let photosByDay: DayPhotos[] = [];
            for (let photo of photos) {
                let [day, month, date] = parseDate(photo.media.createDate);
                if (dayPhotos.day !== day) {
                    photosByDay.push(dayPhotos);
                    dayPhotos = {day, month, layoutMedias: [], date};
                }
                dayPhotos.layoutMedias.push(photo);
            }
            photosByDay.push(dayPhotos);

            // Calculate visual size for photos given viewport size
            const allowedWidth = this.frameWidth;
            const minHeight = 150 + Math.min(window.innerWidth / 30, 64);
            let rows: ILayoutBlock[][] = [];
            let row: ILayoutBlock[] = [];
            let block: ILayoutBlock = {
                layoutMedias: [] as ILayoutMedia[],
                day: firstDay,
                month: firstMonth,
                date: firstDate,
                width: 0,
                height: 0,
                hideDate: false,
            };
            let rowW = 0;
            let prevDaySize = 0
            for (let dayPhotos of photosByDay) {
                let day = dayPhotos.day;
                let month = dayPhotos.month;
                for (let layoutMedia of dayPhotos.layoutMedias) {
                    let preferredWidth = minHeight * layoutMedia.media.ratio;
                    let updatedWidth = rowW + preferredWidth;
                    let remainingWidth = allowedWidth - rowW;
                    let currentDaySize = dayPhotos.layoutMedias.length;

                    // If this photo doesn't fit in the block, or it's a different day, make new block
                    let newMonth = month !== block.month;
                    let newDay = day !== block.day;
                    let newRow = updatedWidth > allowedWidth ||
                        (newDay && remainingWidth - preferredWidth < 100) ||
                        (newDay && currentDaySize > 3) ||
                        (newDay && prevDaySize > 3) ||
                        (this.timeline && newMonth);
                    if (newRow || newDay) {
                        if (block.layoutMedias.length > 0)
                            row.push(block);
                        block = {
                            layoutMedias: [], day, width: 0, height: 0,
                            hideDate: newRow && !newDay,
                            month, date: dayPhotos.date
                        };

                        if (newRow) {
                            if (row.length > 0)
                                rows.push(row);
                            row = [];
                            rowW = 0;
                        }
                    }
                    rowW += preferredWidth;
                    block.layoutMedias.push(layoutMedia);
                }
                prevDaySize = dayPhotos.layoutMedias.length;
            }
            row.push(block);
            rows.push(row);


            const imageMargin = 5;
            const blockMargin = 40;
            for (let row of rows) {
                let blockWidths = [];
                for (let block of row) {
                    block.width = block.layoutMedias
                        .map(p => p.media.ratio * minHeight)
                        .reduce((a, b) => a + b);
                    blockWidths.push(block.width);
                }
                let pixelWidth = blockWidths.reduce((a, b) => a + b);
                let imageMargins = row.map(block => (block.layoutMedias.length - 1) * imageMargin);
                let blockMargins = (row.length - 1) * blockMargin;
                let margins = imageMargins.reduce((a, b) => a + b) + blockMargins;
                let sizeMultiplier = (allowedWidth - margins) / pixelWidth;
                if (sizeMultiplier > 2.1) {
                    sizeMultiplier = 1;
                }
                for (let block of row) {
                    block.height = minHeight * sizeMultiplier;
                    for (let photo of block.layoutMedias) {
                        photo.visualHeight = minHeight * sizeMultiplier;
                        photo.visualWidth = minHeight * photo.media.ratio * sizeMultiplier;
                    }
                }
            }

            this.photoRows = rows;
            this.$emit('photoRowsUpdate');
        },
        onResize() {
            requestAnimationFrame(this.calculateLayout);
        },
        updateFrameWidth() {
            this.frameWidth = (this.$refs.frame as HTMLElement)?.clientWidth ??
                window.innerWidth - this.$vuetify.application.left;
        },
        playVideo(id: string) {
            let video: HTMLVideoElement = (this.$refs['video' + id] as HTMLVideoElement[])?.[0];
            video?.play?.();
        },
        pauseVideo(id: string) {
            let video: HTMLVideoElement = (this.$refs['video' + id] as HTMLVideoElement[])?.[0];
            video?.pause?.();
        },
        scrollIntoView(day: number, month: number, year: number) {
            let targetDate = new Date();
            targetDate.setFullYear(year);
            targetDate.setMonth(month - 1);
            targetDate.setDate(day);
            let target = targetDate.getTime();

            // List is ordered highest date -> lowest date
            let list = this.photoRows;
            while (true) {
                let i = Math.floor(list.length / 2);
                let date = list[i][0].date;
                if (target < date)
                    list = list.slice(i);
                else
                    list = list.slice(0, i);
                if (list.length === 1)
                    break;
            }
            let rows = this.$refs.rows as HTMLElement[];
            console.log("Scrolling into view", day, month, year);
            rows[this.photoRows.indexOf(list[0])].scrollIntoView();
        },
    },
    computed: {
        currentPath() {
            let path = this.$route.path;
            if (path.endsWith('/'))
                return path.substr(0, path.length - 1)
            return path;
        }
    },
    watch: {
        photos() {
            requestAnimationFrame(this.calculateLayout);
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
    background-color: black;
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
    display: block;
}
</style>
