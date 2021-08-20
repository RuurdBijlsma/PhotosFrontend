<template>
    <div class="photo-grid roboto">
        <v-lazy :height="row.height"
                transition="none"
                :class="row.layoutBlocks.flatMap(b => b.layoutMedias.map(l => 'p' + l.media.id))"
                class="photo-row"
                :key="row.id"
                v-for="row in photoRows" :style="{
                    marginTop: row.hasDate ? 0 : grid.mediaMargin + 'px'
                }">
            <div>
                <div class="photo-block"
                     :style="{marginRight: grid.blockMarginRight + 'px'}"
                     v-for="block in row.layoutBlocks">
                    <div class="block-date"
                         v-if="block.showDate"
                         :title="formatDate(block.date, `EEEE, d MMMM y`)"
                         :style="{maxWidth: Math.floor(block.width) + 'px'}">
                        <router-link class="no-style"
                                     :to="`/?date=${formatDate(block.date, 'yyyy-MM-dd')}`">
                            {{ block.dateString }}
                        </router-link>
                    </div>
                    <grid-photo
                        @selectItem="selectItem"
                        class="grid-photo"
                        :style="{marginRight: grid.mediaMargin + 'px'}"
                        v-for="layoutMedia in block.layoutMedias"
                        :key="layoutMedia.media.id" :layout-media="layoutMedia"/>
                </div>
            </div>
        </v-lazy>
    </div>
</template>

<script lang="ts">
import {Media} from "@/ts/Media";
import {api} from "@/ts/constants"
import Vue, {PropType} from "vue";
import {format, formatDistance} from 'date-fns';
import GridPhoto from "@/components/GridPhoto.vue";
import {ILayoutBlock, ILayoutMedia, ILayoutRow, MonthPhotos} from "@/ts/MediaInterfaces";

const d = new Date();
export default Vue.extend({
    name: 'PhotoGrid',
    components: {GridPhoto},
    props: {
        usableWidth: {type: Number, required: true},
        sizeMultiplier: {type: Number, default: 1},
        photos: {type: Array as PropType<Media[]>, required: true},
    },
    data: () => ({
        api,
        photoRows: [] as ILayoutRow[],
        calculateTimeout: -1,
        shiftDown: false,
    }),
    beforeDestroy() {
        document.removeEventListener('keydown', this.keyDown);
        document.removeEventListener('keyup', this.keyUp);
    },
    async mounted() {
        document.addEventListener('keydown', this.keyDown, false);
        document.addEventListener('keyup', this.keyUp, false);
        this.calculateLayout();
        this.$emit('ready', this.height);
    },
    methods: {
        selectItem(media: Media, shiftKey: boolean) {
            let batch = null;
            if (shiftKey && this.lastSelectedPhoto !== null) {
                batch = this.getBatch(media, this.lastSelectedPhoto);
            }
            if (batch !== null) {
                if (this.$store.getters.isSelected(media.id)) {
                    this.$store.commit('removeBatchFromPhotoSelection', batch);
                    this.lastSelectedPhoto = this.$store.getters.selectedMedias[this.$store.getters.selectedMedias.length - 1] ?? null;
                } else {
                    this.$store.commit('addBatchToPhotoSelection', batch);
                }
            } else {
                if (this.$store.getters.isSelected(media.id)) {
                    this.$store.commit('removeFromPhotoSelection', media);
                    if (this.lastSelectedPhoto?.id === media.id) {
                        this.lastSelectedPhoto = this.$store.getters.selectedMedias[this.$store.getters.selectedMedias.length - 1] ?? null;
                    }
                } else {
                    this.lastSelectedPhoto = media;
                    this.$store.commit('addToPhotoSelection', media);
                }
            }
        },
        getBatch(mediaA: Media, mediaB: Media) {
            let [start, end] = [mediaA, mediaB]
                .sort((a, b) => a.createDate.getTime() - b.createDate.getTime());
            let photos: Media[];
            // month based selecting only works on home page,
            // otherwise (album and search page) use media queue to create selection
            if (this.$route.name !== 'Home') {
                photos = this.$store.state.viewerQueue;
            } else {
                let startMonth = start.createDate.getFullYear() * 12 + start.createDate.getMonth();
                let endMonth = end.createDate.getFullYear() * 12 + end.createDate.getMonth();
                let photosPerMonth: MonthPhotos[] = this.$store.state.photosPerMonth;
                let relevantMonths = photosPerMonth.filter(p => {
                    let month = p.year * 12 + (p.month - 1);
                    return month >= startMonth && month <= endMonth;
                }).map(p => p.id);
                let cache = this.$store.state.cachedPhotos;
                console.log(cache);
                photos = [];
                for (let id of relevantMonths) {
                    if (!cache.hasOwnProperty(id)) {
                        this.$store.dispatch('addSnack', {
                            text: "Couldn't complete selection, some photos between the start and end weren't cached.",
                        });
                        return null;
                    }
                    photos.push(...cache[id])
                }
            }
            let indexStart = photos.findIndex(p => p.id === start.id);
            let indexEnd = photos.findIndex(p => p.id === end.id);
            [indexStart, indexEnd] = [indexStart, indexEnd].sort((a, b) => b - a);
            if (indexStart === -1 || indexEnd === -1)
                return null;
            return photos.slice(indexEnd, indexStart + 1);
        },
        keyDown(e: KeyboardEvent) {
            if (e.key === 'Shift') {
                this.shiftDown = true;
            }
        },
        keyUp(e: KeyboardEvent) {
            if (e.key === 'Shift') {
                this.shiftDown = false;
            }
        },
        formatDate(date: number | Date, dateFormat: string) {
            if (typeof date === 'number')
                date = new Date(date);
            return format(date, dateFormat);
        },
        dateToString(date: Date) {
            let distance = formatDistance(date, d, {addSuffix: true});
            if(distance.includes('hour'))
                return 'Today';
            if (distance.includes('day') && +distance.substr(0, distance.indexOf(' ')) < 5)
                return distance;

            let formatString = 'E, d MMM'
            if (date.getFullYear() !== d.getFullYear())
                formatString += ' y';
            return format(date, formatString);
        },
        calculateLayout(resizeChange = false) {
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
            let block: ILayoutBlock | null = null;
            let remainingWidth = this.usableWidth;
            for (let day of byDay) {
                for (let layoutMedia of day.layoutMedia) {
                    let blockDateString = '';
                    if (block !== null) blockDateString = block.dateString;
                    let sameDay = blockDateString === day.dateString;
                    let newRow =
                        (remainingWidth + this.grid.speling < layoutMedia.visualWidth) ||
                        (!sameDay && day.layoutMedia.length > 3)

                    // if (day.dateString === 'Thu, 20 May') {
                    //     console.log({newRow, remainingWidth})
                    // }

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
                            hasDate: block.showDate,
                            id: Math.random().toString(),
                        };
                        remainingWidth = this.usableWidth - layoutMedia.visualWidth;
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

            this.photoRows = photoRows;
            if (resizeChange)
                this.$nextTick(() => this.$emit('resizeReady', this.height));
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
        lastSelectedPhoto: {
            get(): Media {
                return this.$store.state.lastSelectedPhoto;
            },
            set(v: Media) {
                this.$store.commit('lastSelectedPhoto', v);
            },
        },
        isSelecting(): boolean {
            return this.$store.getters.isSelecting;
        },
        grid(): { blockMarginRight: number, blockDateHeight: number, mediaMargin: number, blockHeight: number, speling: number, maxScale: number } {
            return this.$vuetify.breakpoint.mobile ? {
                blockMarginRight: 10,
                blockDateHeight: 40,
                mediaMargin: 3,
                blockHeight: 180 * this.sizeMultiplier,
                speling: 80 * this.sizeMultiplier,
                maxScale: 2,
            } : {
                blockMarginRight: 25,
                blockDateHeight: 40,
                mediaMargin: 5,
                blockHeight: 180 * this.sizeMultiplier,
                speling: 50 * this.sizeMultiplier,
                maxScale: 1.5,
            };
        },
        height(): number {
            return this.photoRows
                .map(r => r.height)
                .reduce((a, b) => a + b, 0) + this.photoRows.length * this.grid.mediaMargin;
        },
        currentPath(): string {
            let path = this.$route.path;
            if (path.endsWith('/'))
                return path.substr(0, path.length - 1)
            return path;
        },
        photoSelection(): Media[] {
            return this.$store.state.photoSelection;
        },
    },
    watch: {
        usableWidth() {
            clearTimeout(this.calculateTimeout);
            this.calculateTimeout = setTimeout(() => {
                requestAnimationFrame(() => this.calculateLayout(true))
            }, 50);
        },
        photos() {
            requestAnimationFrame(() => this.calculateLayout(true));
        },
        grid() {
            requestAnimationFrame(() => this.calculateLayout(true));
        },
    },
})
</script>

<style scoped>
.photo-grid {
    overflow-x: hidden;
    max-width: 100%;
    width: 100%;
    overflow-y: hidden;
}

.photo-block {
    display: inline-block;
}

.photo-block:last-child {
    margin-right: 0 !important;
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
    padding: 0 10px;
}

.grid-photo:last-child {
    margin-right: 0 !important;
}
</style>
