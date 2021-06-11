<template>
    <div class="photo-grid roboto" ref="frame">
        <div class="block-row" v-for="row in photoRows" ref="rows">
            <div class="photo-block" v-for="block in row" ref="blocks">
                <div class="block-day"
                     :title="block.day"
                     :class="{'hide-date':block.hideDate, [dateToClass(block.date)]:true}"
                     :style="{maxWidth: Math.floor(block.width) + 'px'}">
                    <router-link class="no-style" :to="`/?date=${formatDate(block.date, 'yyyy-MM-dd')}`">
                        {{ block.day }}
                    </router-link>
                </div>
                <div class="photos">
                    <router-link class="photo"
                                 :class="`p${media.id}`"
                                 :to="`${currentPath}/photo/${media.id}`"
                                 v-for="{media, visualWidth, visualHeight} in block.layoutMedias"
                                 :key="media.id"
                                 :style="{
                        height: visualHeight + 'px',
                        width: visualWidth + 'px',
                     }">
                        <div v-if="media.type === 'photo'"
                             class="image-container">
                            <div class="image-background"
                                 :style="{backgroundImage: `url(${getThumbUrl(media.id, block.height)})`}"/>
                            <div class="image-overlay">
                                <div class="image-info">
                                    <v-icon v-if="media.subType === 'vr'" class="icon" color="white">
                                        mdi-rotate-3d-variant
                                    </v-icon>
                                    <v-icon v-else-if="media.subType === 'portrait'" class="icon" color="white">
                                        mdi-blur
                                    </v-icon>
                                </div>
                            </div>
                        </div>
                        <div class="video-container" v-else
                             @mouseleave="pauseVideo(media.id)"
                             @mouseenter="playVideo(media.id)">
                            <video :poster="`${getThumbUrl(media.id, block.height)}`"
                                   muted loop
                                   :ref="`video${media.id}`"
                                   :src="`${api}/photos/webm/${media.id}.webm`"/>
                            <div class="video-overlay">
                                <div class="video-info">
                                    <span class="video-duration">{{ toHms(media.duration / 1000) }}</span>
                                    <v-icon v-if="media.subType === 'none'" class="icon" color="white">
                                        mdi-play-circle-outline
                                    </v-icon>
                                    <v-icon v-else-if="media.subType === 'slomo'" class="icon" color="white">
                                        mdi-play-speed
                                    </v-icon>
                                </div>
                            </div>
                        </div>
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
import {secondsToHms} from "@/ts/utils";
import {format} from 'date-fns';

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
        formatDate(date: number | Date, dateFormat: string) {
            if (typeof date === 'number')
                date = new Date(date);
            return format(date, dateFormat);
        },
        getThumbUrl(id: string, height: number) {
            let size = 'tiny';
            if (height > 260)
                size = 'small';
            if (height > 500)
                size = 'big';
            return `${api}/photos/${size}/${id}.webp`;
        },
        async calculateLayout() {
            let i = Math.floor(Math.random() * 1000);
            console.time(`Calculate layout ${i}`);
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
            const allowedWidth = this.frameWidth - 2;
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
                        photo.visualWidth = Math.floor(minHeight * photo.media.ratio * sizeMultiplier);
                    }
                }
            }
            this.photoRows = rows;
            this.$emit('photoRowsUpdate');
            console.timeEnd(`Calculate layout ${i}`);
        },
        onResize() {
            if (this.$vuetify.breakpoint.width === window.innerWidth && this.$vuetify.breakpoint.height === window.innerHeight) {
                return;
            }
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
        dateToClass(date: Date | number) {
            if (typeof date === 'number') {
                date = new Date(date);
            }
            let day = date.toDateString();
            return `d${day.replace(/ /g, '_')}`;
        },
        async scrollMediaIntoView(media: Media) {
            let mediaElement = document.querySelector(`.p${media.id}`);
            if (mediaElement === null) return;
            mediaElement.scrollIntoView({block: 'center'});
        },
        async scrollDateIntoView(day: number, month: number, year: number) {
            let targetDate = new Date();
            targetDate.setFullYear(year);
            targetDate.setMonth(month - 1);
            targetDate.setDate(day);
            let dateClass = this.dateToClass(targetDate);
            let dateElement = document.querySelector(`.${dateClass}`);
            if (dateElement === null) {
                for (let row of this.photoRows) {
                    let target = targetDate.getTime();
                    // List is ordered highest date -> lowest date, binary search for nearest item to target date
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
                    let index = this.photoRows.indexOf(list[0]);
                    row: for (let i = index; i >= 0; i--) {
                        let row = this.photoRows[i];
                        for (let {date} of row) {
                            let d = new Date(date);
                            if (d.getDate() !== day || d.getMonth() + 1 !== month || d.getFullYear() !== year) {
                                index = i + 1;
                                break row;
                            }
                        }
                    }
                    let rows = this.$refs.rows as HTMLElement[];
                    rows[index].scrollIntoView({block: 'center'});
                }
            } else {
                dateElement.scrollIntoView({block: 'start'});
            }
        },
        toHms(seconds: number) {
            return secondsToHms(seconds);
        },
    },
    computed: {
        currentPath() {
            let path = this.$route.path;
            if (path.endsWith('/'))
                return path.substr(0, path.length - 1)
            return path;
        },
    },
    watch: {
        photos() {
            requestAnimationFrame(this.calculateLayout);
        },
    },
})
</script>

<style scoped>
.photo-grid {
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
    background-color: rgba(128, 128, 128, 0.2);
}

.photo:last-child {
    margin-right: 0;
}

.photo > * {
    position: relative;
    width: 100%;
    height: 100%;
}

.image-background {
    background-size: contain;
    background-position: center;
    background-repeat: no-repeat;
    width: 100%;
    height: 100%;
    position: absolute;
    top: 0;
    border-radius: 3px;
}

.image-overlay {
    width: 100%;
    height: 100%;
    position: absolute;
    display: flex;
    align-items: flex-start;
    justify-content: flex-end;
    border-radius: 3px;
}

.image-info {
    padding: 5px;
}

.image-icon {
    font-size: 20px !important;
}

.video-container > video {
    width: 100%;
    height: 100%;
    display: block;
    position: absolute;
    border-radius: 3px;
}

.video-overlay {
    width: 100%;
    height: 100%;
    position: absolute;
    display: flex;
    align-items: flex-start;
    justify-content: flex-end;
    background-image: linear-gradient(0deg, transparent, rgba(0, 0, 0, 0.2));
    border-radius: 3px;
}

.video-info {
    padding: 5px;
}

.video-duration {
    font-size: 13px;
    color: white;
    margin-right: 10px;
}

.icon {
    font-size: 20px !important;
    text-shadow: 0 0 20px rgba(0, 0, 0, 0.7);
}
</style>
