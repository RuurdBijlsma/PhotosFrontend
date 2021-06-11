<template>
    <div class="month-grid roboto">
        <div class="photo-row" v-for="row in photoRows">
            <div class="photo-block" v-for="block in row.layoutBlocks">
                <div class="block-date" v-if="block.showDate" :style="{maxWidth: Math.floor(block.width) + 'px'}">
                    <router-link class="no-style" :to="`/scroll/?date=${formatDate(block.date, 'yyyy-MM-dd')}`">
                        {{ block.dateString }}
                    </router-link>
                </div>
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
</template>

<script lang="ts">
import {Media} from "@/ts/Media";
import {api} from "@/ts/constants"
import Vue from "vue";
import {ILayoutMedia} from "@/ts/ILayoutMedia";
import {format, formatDistance} from 'date-fns';
import {secondsToHms} from "@/ts/utils";

interface ILayoutBlock2 {
    layoutMedias: ILayoutMedia[],
    dateString: string,
    date: Date,
    width: number,
    height: number,
    showDate: boolean,
}

interface ILayoutRow {
    layoutBlocks: ILayoutBlock2[],
    hasDate: boolean,
    width: number,
    height: number,
}


const d = new Date();
export default Vue.extend({
    name: 'MonthGrid',
    components: {},
    props: {
        usableWidth: {type: Number, required: true},
        year: {type: Number, required: true},
        month: {type: Number, required: true},
        index: {type: Number, required: true},
    },
    data: () => ({
        api,
        grid: {
            blockMarginRight: 40,
            blockDateHeight: 40,
            mediaMargin: 5,
            blockHeight: 240,
            speling: 50,
            maxScale: 1.73,
        },
        photos: [] as Media[],
        photoRows: [] as ILayoutRow[],
    }),
    async mounted() {
        this.photos = await this.$store.dispatch('getCachedPhotos', {year: this.year, month: this.month});
        this.photoRows = this.calculateLayout();
        let height = this.photoRows
            .map(r => r.height)
            .reduce((a, b) => a + b, 0) + this.photoRows.length * this.grid.mediaMargin;
        this.$emit('ready', height, this.photos);
    },
    methods: {
        formatDate(date: number | Date, dateFormat: string) {
            if (typeof date === 'number')
                date = new Date(date);
            return format(date, dateFormat);
        },
        playVideo(id: string) {
            let video: HTMLVideoElement = (this.$refs['video' + id] as HTMLVideoElement[])?.[0];
            video?.play?.();
        },
        pauseVideo(id: string) {
            let video: HTMLVideoElement = (this.$refs['video' + id] as HTMLVideoElement[])?.[0];
            video?.pause?.();
        },
        toHms(seconds: number) {
            return secondsToHms(seconds);
        },
        getThumbUrl(id: string, height: number) {
            let size = 'tiny';
            if (height > 260)
                size = 'small';
            if (height > 500)
                size = 'big';
            return `${api}/photos/${size}/${id}.webp`;
        },
        dateToString(date: Date) {
            if (d.getTime() - date.getTime() < 1000 * 60 * 60 * 24 * 5)
                return formatDistance(date, d, {addSuffix: true});

            let formatString = 'E, d MMM'
            if (date.getFullYear() !== d.getFullYear())
                formatString += ' y';
            return format(date, formatString);
        },
        calculateLayout() {
            let layoutMedias = this.photos.map(media => ({visualWidth: 0, visualHeight: 0, media}))

            interface DayPhotos {
                layoutMedia: ILayoutMedia[],
                date: Date,
                dateString: string,
                guessedWidth: number,
            }

            let byDay: DayPhotos[] = [];
            let lastObj: null | DayPhotos = null;
            for (let layoutMedia of layoutMedias) {
                let media = layoutMedia.media;
                let width = this.grid.blockHeight * media.width / media.height;
                layoutMedia.visualHeight = this.grid.blockHeight;
                layoutMedia.visualWidth = width;

                let date = media.createDate;
                let dateString = this.dateToString(date);
                if (lastObj !== null && lastObj.dateString === dateString) {
                    lastObj.layoutMedia.push(layoutMedia);
                    lastObj.guessedWidth += width += this.grid.mediaMargin;
                } else {
                    let dayPhotos: DayPhotos = {
                        layoutMedia: [layoutMedia],
                        date,
                        dateString,
                        guessedWidth: width
                    };
                    byDay.push(dayPhotos);
                    lastObj = dayPhotos;
                }
            }

            let photoRows: ILayoutRow[] = [];
            let row: ILayoutRow | null = null;
            let block: ILayoutBlock2 | null = null;
            let remainingWidth = this.usableWidth;
            for (let day of byDay) {
                for (let layoutMedia of day.layoutMedia) {
                    let blockDateString = '';
                    if (block !== null) blockDateString = block.dateString;
                    let sameDay = blockDateString === day.dateString;
                    let newRow =
                        (remainingWidth + this.grid.speling < layoutMedia.visualWidth) ||
                        (!sameDay && day.layoutMedia.length > 3)
                    if (block === null || row === null || newRow) {
                        // Very first iteration of loops
                        // OR
                        // new image won't fit in this row
                        // SO
                        // start new row and block

                        // noinspection PointlessBooleanExpressionJS
                        let isFirst: boolean = block === null;
                        block = {
                            layoutMedias: [layoutMedia],
                            date: day.date,
                            dateString: day.dateString,
                            showDate: !sameDay || isFirst,
                            width: layoutMedia.visualWidth,
                            height: this.grid.blockHeight,
                        };
                        row = {
                            height: block.height,
                            width: block.width,
                            layoutBlocks: [block],
                            hasDate: block.showDate
                        };
                        remainingWidth = this.usableWidth;
                        photoRows.push(row);
                        // Current layoutMedia is dealt with, continue
                        continue;
                    }

                    // layoutMedia fits in this row
                    if (!sameDay) {
                        // New day, so start new block
                        block = {
                            layoutMedias: [layoutMedia],
                            date: day.date,
                            dateString: day.dateString,
                            showDate: true,
                            width: layoutMedia.visualWidth,
                            height: this.grid.blockHeight,
                        };
                        remainingWidth -= layoutMedia.visualWidth;
                        row.layoutBlocks.push(block);
                        row.width += block.width;
                        row.hasDate = true;
                        // Current layoutMedia is dealt with, continue
                        continue;
                    }

                    // layoutMedia fits in this block
                    block.width += layoutMedia.visualWidth;
                    row.width += layoutMedia.visualWidth;
                    block.layoutMedias.push(layoutMedia);
                    remainingWidth -= layoutMedia.visualWidth;
                }
            }

            for (let row of photoRows) {
                let imageMargins = this.grid.mediaMargin * row.layoutBlocks
                    .flatMap(b => b.layoutMedias.length - 1)
                    .reduce((a, b) => a + b, 0);
                let blockMargins = this.grid.blockMarginRight * (row.layoutBlocks.length - 1);
                let scale = (this.usableWidth - imageMargins - blockMargins) / row.width;
                if (scale > this.grid.maxScale)
                    scale = 1;
                row.height *= scale;
                let blockWidths = 0;
                for (let block of row.layoutBlocks) {
                    let mediaWidths = 0;
                    for (let layoutMedia of block.layoutMedias) {
                        layoutMedia.visualWidth *= scale;
                        layoutMedia.visualHeight = row.height;
                        mediaWidths += layoutMedia.visualWidth;
                    }
                    block.height = row.height + (row.hasDate ? this.grid.blockDateHeight : 0);
                    block.width = mediaWidths + (block.layoutMedias.length - 1) * this.grid.mediaMargin;
                    blockWidths += block.width;
                }
                if (row.hasDate) row.height += this.grid.blockDateHeight;
                row.width = blockWidths + (row.layoutBlocks.length - 1) * this.grid.blockMarginRight;
            }

            return photoRows;
        },
        scrollMediaIntoView(media: Media | null) {
            if (media === null)
                return;
            let element = document.querySelector(`.p${media.id}`);
            if (element === null)
                return;
            element.scrollIntoView({block: "center"})
        },
        scrollDateIntoView(date: Date, dayBased = true) {
            let bestDistance = Infinity;
            let bestMedia: Media | null = null;
            let target = dayBased ? date.getDate() : date.getTime();
            rows: for (let row of this.photoRows) {
                for (let block of row.layoutBlocks) {
                    let blockValue = dayBased ? block.date.getDate() : block.date.getTime();
                    let distance = Math.abs(target - blockValue);
                    if (distance <= bestDistance) {
                        bestDistance = distance;
                        bestMedia = block.layoutMedias[0]?.media;
                        if (distance === 0) break rows;
                    } else {
                        break rows;
                    }
                }
            }
            if (bestMedia !== null)
                this.scrollMediaIntoView(bestMedia);
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
    watch: {}
})
</script>

<style scoped>
.month-grid {
    overflow-x: hidden;
    max-width: 100%;
    width: 100%;
    height: 100%;
}

.photo-block {
    display: inline-block;
    margin-right: 40px;
}

.photo-block:last-child {
    margin-right: 0;
}

.block-date {
    height: 40px;
    display: flex;
    align-items: center;
    font-weight: 500;
    font-size: 15px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.photo {
    display: inline-block;
    background-color: rgba(82, 79, 79, 0.15);
    margin-right: 5px;
    margin-bottom: -3px;
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
