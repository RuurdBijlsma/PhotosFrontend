<template>
    <div class="month-grid roboto">
        <div class="photo-row" v-for="row in photoRows">
            <div class="photo-block" v-for="block in row.layoutBlocks">
                <div class="block-date" v-if="block.showDate" :style="{maxWidth: Math.floor(block.width) + 'px'}">
                    {{ block.dateString }}
                </div>
                <div>
                    <div class="media-item" v-for="{visualWidth, visualHeight, media} in block.layoutMedias"
                         :key="media.id"
                         :style="{
                        width: visualWidth + 'px',
                        height: visualHeight + 'px',
                    }">
                        <div v-if="media.type === 'photo'"
                             :style="{backgroundImage: `url(${api}/photos/tiny/${media.id}.webp)`}"/>
                        <video v-else
                               :src="`${api}/photos/webm/${media.id}.webm`"
                               :poster="`${api}/photos/tiny/${media.id}.webp`"/>
                    </div>
                </div>
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
            blockHeight: 260,
            speling: 100,
            maxScale: 1.73,
        },
        photos: [] as Media[],
        photoRows: [] as ILayoutRow[],
    }),
    async mounted() {
        console.log("loading MonthGrid", this.year, this.month);
        this.photos = await this.$store.dispatch('getCachedPhotos', {year: this.year, month: this.month});
        this.photoRows = this.calculateLayout();
        let height = this.photoRows.map(r => r.height).reduce((a, b) => a + b, 0) + this.photoRows.length * this.grid.mediaMargin;
        this.$emit('ready', height);
    },
    methods: {
        dateToString(date: Date) {
            if (d.getTime() - date.getTime() < 1000 * 60 * 60 * 24 * 5)
                return formatDistance(date, d, {addSuffix: true});

            let formatString = 'e MMM'
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
                    if (block === null || row === null || remainingWidth + this.grid.speling < layoutMedia.visualWidth) {
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
    },
    computed: {},
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

.media-item {
    display: inline-block;
    background-color: rgba(82, 79, 79, 0.15);
    margin-right: 5px;
    margin-bottom: 5px;
}

.media-item:last-child {
    margin-right: 0;
}

.media-item > * {
    width: 100%;
    height: 100%;
    display: inline-block;
    background-size: contain;
    background-position: center;
    margin-bottom: -7px;
}
</style>
