<template>
    <div class="media-photo">
        <div class="left-pane" :style="{
            width: `calc(100% - ${infoPaneSize}px)`
        }">
            <div class="media-item">
                <div class="top-gradient"/>
                <v-zoomer
                    :zoomed.sync="imgZoomed"
                    :max-scale="10"
                    :zooming-elastic="false"
                    class="element-item"
                    v-if="media && media.type === 'photo'">
                    <v-img :lazy-src="`${api}/photo/tiny/${this.media.id}.webp`"
                           :src="`${api}/photos/full/${this.media.id}`"
                           :key="media.id"
                           ref="image"
                           contain>
                    </v-img>
                </v-zoomer>
                <video class="element-item"
                       :poster="`${api}/photo/big/${media.id}.webp`"
                       controls
                       v-else-if="media"
                       autoplay
                       :src="`${api}/photo/webm/${media.id}.webm`">
                </video>
                <v-btn icon dark @click="close" class="back-button btn">
                    <v-icon>mdi-arrow-left</v-icon>
                </v-btn>
                <v-btn icon dark @click="showInfo = !showInfo" class="info-button btn">
                    <v-icon>mdi-information-outline</v-icon>
                </v-btn>
                <v-menu :close-on-content-click="false"
                        :nudge-left="180"
                        min-width="auto">
                    <template v-slot:activator="{ on, attrs }">
                        <v-btn dark icon v-bind="attrs" v-on="on" class="menu-button btn">
                            <v-icon>mdi-dots-vertical</v-icon>
                        </v-btn>
                    </template>
                    <v-list dense>
                        <v-list-item @click="reprocess(media)">
                            <v-list-item-avatar>
                                <v-progress-circular :size="25" :width="2" indeterminate v-if="reprocessLoading"/>
                                <v-icon v-else>mdi-auto-fix</v-icon>
                            </v-list-item-avatar>
                            <v-list-item-content>
                                <v-list-item-title>
                                    Reprocess item
                                </v-list-item-title>
                            </v-list-item-content>
                        </v-list-item>
                        <v-list-item @click="fixDateFromFile()">
                            <v-list-item-avatar>
                                <v-progress-circular :size="25" :width="2" indeterminate v-if="fixDateLoading"/>
                                <v-icon v-else>mdi-calendar-range</v-icon>
                            </v-list-item-avatar>
                            <v-list-item-content>
                                <v-list-item-title>
                                    Fix date from filename
                                </v-list-item-title>
                            </v-list-item-content>
                        </v-list-item>
                        <v-list-item @click="deleteItem()">
                            <v-list-item-avatar>
                                <v-progress-circular :size="25" :width="2" indeterminate v-if="deleteLoading"/>
                                <v-icon v-else>mdi-delete-outline</v-icon>
                            </v-list-item-avatar>
                            <v-list-item-content>
                                <v-list-item-title>
                                    Delete
                                </v-list-item-title>
                            </v-list-item-content>
                        </v-list-item>
                    </v-list>
                </v-menu>
                <v-btn fab dark :disabled="!canSkipLeft" @click="previous" class="prev-button btn" v-show="!imgZoomed">
                    <v-icon>mdi-chevron-left</v-icon>
                </v-btn>
                <v-btn fab dark :disabled="!canSkipRight" @click="next" class="next-button btn" v-show="!imgZoomed">
                    <v-icon>mdi-chevron-right</v-icon>
                </v-btn>
            </div>
        </div>
        <v-sheet class="right-pane" :style="{
            marginRight: showInfo ? '0' : '-400px',
            width: `${infoPaneSize}px`,
        }" :key="loadInfo">
            <div class="info-header">
                <v-btn @click="showInfo = false" icon>
                    <v-icon>mdi-close</v-icon>
                </v-btn>
                <span class="ml-3">Info</span>
            </div>
            <v-list class="info-content" v-if="media" subheader>
                <v-subheader>Details</v-subheader>
                <v-list-item two-line v-if="media.filename">
                    <v-list-item-avatar>
                        <v-icon>mdi-image</v-icon>
                    </v-list-item-avatar>
                    <v-list-item-content>
                        <v-list-item-title>
                            {{ media.filename }}
                        </v-list-item-title>
                        <v-list-item-subtitle>
                            <span class="mr-3">{{ megaPixels }}MP</span>
                            <span class="mr-3">{{ media.width }} × {{ media.height }}</span>
                            <span>{{ readableBytes }}</span>
                        </v-list-item-subtitle>
                    </v-list-item-content>
                </v-list-item>
                <v-list-item two-line>
                    <v-list-item-avatar>
                        <v-icon>mdi-calendar</v-icon>
                    </v-list-item-avatar>
                    <v-list-item-content>
                        <v-list-item-title>
                            <v-menu
                                :close-on-content-click="false"
                                transition="scale-transition"
                                offset-y
                                v-model="dateMenu"
                                :nudge-left="50"
                                min-width="auto">
                                <template v-slot:activator="{ on, attrs }">
                                    <span class="mr-4" v-bind="attrs" v-on="on">{{ formattedCreateDate }}</span>
                                </template>
                                <v-card>
                                    <v-date-picker
                                        class="roboto"
                                        max-width="360"
                                        v-model="createDate"
                                        :max="new Date().toISOString().substr(0, 10)"
                                        min="1950-01-01"/>
                                    <v-card-actions>
                                        <v-spacer/>
                                        <v-btn text @click="dateMenu=false">Cancel</v-btn>
                                        <v-btn color="primary" text
                                               :loading="dateLoading"
                                               @click="saveEditedDate">
                                            Save
                                        </v-btn>
                                    </v-card-actions>
                                </v-card>
                            </v-menu>
                        </v-list-item-title>
                        <v-list-item-subtitle>
                            <v-menu
                                :close-on-content-click="false"
                                transition="scale-transition"
                                offset-y
                                v-model="timeMenu"
                                :nudge-left="50"
                                min-width="auto">
                                <template v-slot:activator="{ on, attrs }">
                                    <span v-bind="attrs" v-on="on">{{ formattedCreateTime }}</span>
                                </template>
                                <v-card>
                                    <v-time-picker
                                        class="roboto"
                                        format="24hr"
                                        use-seconds
                                        scrollable
                                        v-model="createTime"
                                        max-width="360"/>
                                    <v-card-title class="error--text" v-if="dateError">
                                        {{ dateError }}
                                    </v-card-title>
                                    <v-card-actions>
                                        <v-spacer/>
                                        <v-btn text @click="timeMenu=false">Cancel</v-btn>
                                        <v-btn color="primary" text
                                               :loading="dateLoading"
                                               @click="saveEditedDate">
                                            Save
                                        </v-btn>
                                    </v-card-actions>
                                </v-card>
                            </v-menu>
                        </v-list-item-subtitle>
                    </v-list-item-content>
                </v-list-item>
                <v-list-item two-line v-if="media.exif.Make && media.exif.Model">
                    <v-list-item-avatar>
                        <v-icon>mdi-camera-iris</v-icon>
                    </v-list-item-avatar>
                    <v-list-item-content>
                        <v-list-item-title>
                            {{ media.exif.Make }} {{ media.exif.Model }}
                        </v-list-item-title>
                        <v-list-item-subtitle>
                            <span class="mr-3" v-if="media.exif.FNumber">ƒ/{{ media.exif.FNumber }}</span>
                            <span class="mr-3" v-if="media.exif.FocalLength">{{ media.exif.FocalLength }}mm</span>
                            <span class="mr-3" v-if="exposureTime">{{ exposureTime }}</span>
                            <span v-if="media.exif.ISO">ISO{{ media.exif.ISO }}</span>
                        </v-list-item-subtitle>
                    </v-list-item-content>
                </v-list-item>
                <v-menu
                    :close-on-content-click="false"
                    transition="scale-transition"
                    min-width="auto">
                    <template v-slot:activator="{ on, attrs }">
                        <v-list-item v-bind="attrs"
                                     v-on="on"
                                     two-line v-if="classifications && classifications.length > 0">
                            <v-list-item-avatar>
                                <v-icon>mdi-eye</v-icon>
                            </v-list-item-avatar>
                            <v-list-item-content>
                                <v-list-item-title :title="classifications[0].labels">
                                    {{ classifications[0].labels }}
                                </v-list-item-title>
                                <v-list-item-subtitle :title="classifications[0].glossary">
                                    {{ classifications[0].glossary }}
                                </v-list-item-subtitle>
                            </v-list-item-content>
                        </v-list-item>
                    </template>
                    <v-list max-width="360">
                        <v-list-item two-line v-for="(classification, i) in classifications" :key="i"
                                     :to="classification.firstLabel ? `/search/${classification.firstLabel}` : null">
                            <v-list-item-avatar>
                                <v-icon>mdi-alpha-{{ 'abcdefg'[i] }}-circle-outline</v-icon>
                            </v-list-item-avatar>
                            <v-list-item-content>
                                <v-list-item-title :title="classification.labels">
                                    {{ classification.labels }}
                                </v-list-item-title>
                                <v-list-item-subtitle :title="classification.glossary">
                                    {{ classification.glossary }}
                                </v-list-item-subtitle>
                            </v-list-item-content>
                        </v-list-item>
                    </v-list>
                </v-menu>
                <v-list-item two-line v-if="media.location" :to="`/search/${place}`">
                    <v-list-item-avatar>
                        <v-icon>mdi-map-marker-outline</v-icon>
                    </v-list-item-avatar>
                    <v-list-item-content>
                        <v-list-item-title v-if="place">
                            {{ place }}
                        </v-list-item-title>
                        <v-list-item-subtitle :title="subPlace">
                            <span>{{ subPlace }}</span>
                        </v-list-item-subtitle>
                    </v-list-item-content>
                </v-list-item>
            </v-list>
            <div class="location-map mt-5" v-if="media && media.location" @click="openMaps(media.location)">

            </div>
        </v-sheet>
    </div>
</template>

<script lang="ts">
import Vue from 'vue'
import {api} from "@/ts/constants"
import {Location, Media} from "@/ts/Media";
import {bytesToReadable} from "@/ts/utils";
import {format, parseISO} from 'date-fns'
import {filenameToDate} from "@/ts/utils";


export default Vue.extend({
    name: 'Photo',
    components: {},
    props: {},
    data: () => ({
        dateMenu: false,
        timeMenu: false,
        editingDate: new Date(),
        dateLoading: false,
        dateError: '',
        api,
        media: null as Media | null,
        isLoading: new Set(),
        loadInfo: 0,
        infoPaneSize: 400,
        reprocessLoading: false,
        deleteLoading: false,
        fixDateLoading: false,
        imgZoomed: false,
    }),
    beforeDestroy() {
        document.removeEventListener('keydown', this.handleKey);
    },
    async mounted() {
        this.media = this.queue.find(i => i.id === this.id) ?? null;
        await this.fullMediaLoad();
        this.$store.commit('keepInView', this.media);
        document.addEventListener('keydown', this.handleKey, false);
    },
    methods: {
        async fixDateFromFile() {
            if (this.media === null) return;
            let filename = this.media.filename;
            if (filename === null) return;
            let newDate = filenameToDate(filename);
            if (newDate === null) {
                this.$store.dispatch('addSnack', {text: "Couldn't retrieve date from filename"}).then();
                return;
            }
            this.fixDateLoading = true;
            let accepted = await this.$store.dispatch('showPrompt', {
                title: `Is this date correct?`,
                subtitle: `
                    <p><b>Filename: </b>${filename}</p>
                    <div><b>New date: </b>${format(newDate, 'yyyy-MM-dd HH:mm:ss')}</div>
                `,
            });
            if (!accepted) {
                this.fixDateLoading = false;
                return;
            }
            console.log(filename);
            await this.changeDate(newDate);
            this.fixDateLoading = false;
        },
        async deleteItem() {
            if (this.media === null) return;
            this.deleteLoading = true;
            let accepted = await this.$store.dispatch('showPrompt', {
                title: `Are you sure you want to delete this ${this.media.type}`,
                subtitle: `This cannot be undone.`,
                confirmText: 'Delete',
            });
            if (!accepted) {
                this.deleteLoading = false;
                return;
            }
            let success = await this.$store.dispatch('apiRequest', {
                url: `photos/deleteItem/${this.media.id}`
            });
            if (success) {
                this.$store.dispatch('addSnack', {text: 'Deleted ' + this.media.filename}).then();
                this.next();
                this.$store.commit('reloadPhotos', this.media);
            } else {
                this.$store.dispatch('addSnack', {text: 'Failed to delete ' + this.media.filename}).then();
            }
            this.deleteLoading = false;
        },
        async changeDate(date: Date) {
            if (this.media === null) return;
            let success = await this.$store.dispatch('apiRequest', {
                url: `photos/changeDate/${this.media.id}`,
                body: {date: date.getTime()}
            });
            if (success === true) {
                this.dateError = '';
                this.media.createDate = date;

                console.log("Reloading photos");
                this.$store.commit('reloadPhotos', this.media);
                return true;
            } else {
                return false;
            }
        },
        async saveEditedDate() {
            if (this.media === null) return;
            let isDateMenu = this.dateMenu;
            this.dateLoading = true;
            let success = await this.changeDate(this.editedDate);
            if (success) {
                if (isDateMenu) this.dateMenu = false;
                else this.timeMenu = false;
            } else {
                this.dateError = isDateMenu ? 'Failed to set date!' : 'Failed to set time!';
            }
            this.dateLoading = false;
        },
        openMaps(location: Location | null) {
            if (location === null)
                return;
            window.open(`https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}`)
        },
        async reprocess(media: Media) {
            this.reprocessLoading = true;
            let {id} = await this.$store.dispatch('apiRequest', {url: `photos/reprocess/${media.id}`});
            let path = this.$route.path.split('/').filter(p => p.length !== 0);
            path[path.length - 1] = id;
            await this.$router.replace(`/${path.join('/')}`);
            this.$store.commit('reloadPhotos', true);
            this.reprocessLoading = false;
        },
        handleKey(e: KeyboardEvent) {
            switch (true) {
                case e.key === 'ArrowRight':
                    this.next();
                    break;
                case e.key === 'ArrowLeft':
                    this.previous();
                    break;
            }
        },
        close() {
            let path = this.$route.path.split('/').filter(p => p.length !== 0);
            let newPath = '/' + path.slice(0, path.length - 2).join('/');
            this.$router.push(newPath);
        },
        previous() {
            let prev = this.queue[this.index - 1];
            if (!prev) return;
            this.media = prev;
            this.$store.commit('keepInView', this.media);
            this.fullMediaLoad();
            let path = this.$route.path.split('/');
            this.$router.replace([...path.slice(0, path.length - 1), prev.id].join('/'));
        },
        next() {
            let next = this.queue[this.index + 1];
            if (!next) return;
            this.media = next;
            this.$store.commit('keepInView', this.media);
            this.fullMediaLoad();
            let path = this.$route.path.split('/');
            this.$router.replace([...path.slice(0, path.length - 1), next.id].join('/'));
        },
        async fullMediaLoad(idOverride: string | null = null) {
            let id = idOverride ?? this.media?.id ?? this.id;
            if (this.isLoading.has(id))
                return;
            this.isLoading.add(id);

            let media = await this.$store.dispatch('apiRequest', {url: `photos/${id}`}).then(Media.fromObject);
            if (idOverride !== null || this.media === null || id === this.media?.id) {
                this.media = media;
                this.loadInfo++;
            }
            this.isLoading.delete(id);
        },
    },
    computed: {
        classifications(): { labels: string, glossary: string }[] | null {
            let classification = this.media?.classifications ?? null;
            if (classification === null)
                return null;
            const capitalize = (s: string) => s.substr(0, 1).toUpperCase() + s.substr(1);
            return classification.map(c => ({
                firstLabel: c.levels[0].labels[0],
                labels: c.levels[0].labels.slice(0, 3).join(', '),
                glossary: capitalize(c.levels[0].glossary),
            }))
        },
        country(): string | null {
            return this.media?.location?.places?.find?.(p => p.type === 'country')?.name ?? null;
        },
        place(): string | null {
            return this.media?.location?.places?.find?.(p => p.type === 'place')?.name ?? null;
        },
        subPlace(): string | null {
            return [...this.admins, this.country].join(', ')
        },
        admins(): string[] {
            let location = this.media?.location ?? null;
            if (location === null)
                return [];
            return location.places.filter(p => p.type !== 'place' && p.type !== 'country').map(p => p.name);
        },
        exposureTime(): string | null {
            let exposureTime = this.media?.exif?.ExposureTime ?? null;
            if (exposureTime === null)
                return null;
            if (exposureTime < 1)
                return `1/${Math.round(1 / exposureTime)}`
            return exposureTime.toString();
        },
        readableBytes(): string {
            return bytesToReadable(this.media?.size ?? 0);
        },
        showInfo: {
            get(): boolean {
                return this.$store.state.showInfo;
            },
            set(v: boolean) {
                this.$store.commit('showInfo', v);
            }
        },
        editedDate(): Date {
            return new Date(`${this.createDate} ${this.createTime}`);
        },
        formattedCreateTime() {
            let date = this.media?.createDate ?? new Date();
            return format(date, 'H:mm:ss');
        },
        formattedCreateDate() {
            let date = this.media?.createDate ?? new Date();
            return format(date, 'EEEE, do MMMM yyyy');
        },
        createTime: {
            get(): string {
                let date = this.editingDate ?? new Date();
                return format(date, 'H:mm:ss')
            },
            set(v: string) {
                this.editingDate = new Date(`${this.createDate} ${v}`);
            }
        },
        createDate: {
            get(): string {
                let date = this.editingDate ?? new Date();
                return format(parseISO(date.toISOString()), 'yyyy-MM-dd');
            },
            set(v: string) {
                if (this.media === null) return;
                this.editingDate = new Date(`${v} ${this.createTime}`);
            }
        },
        megaPixels(): number {
            return Math.round((this.media?.width ?? 0) * (this.media?.height ?? 0) / 100000) / 10;
        },
        canSkipLeft(): boolean {
            return this.index > 0;
        },
        canSkipRight(): boolean {
            return this.index + 1 < this.queue.length;
        },
        index(): number {
            return this.queue.findIndex(i => i.id === this.id);
        },
        queue(): Media[] {
            return this.$store.state.viewerQueue;
        },
        id() {
            return this.$route.params.id;
        },
    },
    watch: {
        media() {
            if (this.media !== null)
                this.editingDate = this.media?.createDate ?? new Date();
        },
        id() {
            this.fullMediaLoad(this.id);
        },
    },
})
</script>

<style scoped>
.media-photo {
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    position: fixed;
    background-color: grey;
    z-index: 5;
    display: flex;
    --button-padding: 20px;
}

.left-pane {
    background-color: black;
    position: relative;
    display: block;
    flex-grow: 1;
}

.media-item {
    position: relative;
    width: 100%;
    height: 100%;
}

.top-gradient {
    position: absolute;
    width: 100%;
    height: 100px;
    z-index: 2;
    background-image: linear-gradient(to bottom, rgba(0, 0, 0, 0.37), transparent);
}

.element-item {
    width: 100%;
    height: 100%;
}

.element-item >>> .zoomer {
    display: flex;
}

.btn {
    position: absolute;
    z-index: 3;
}

.back-button {
    top: var(--button-padding);
    left: var(--button-padding);
}

.info-button {
    top: var(--button-padding);
    right: calc(var(--button-padding) * 2 + 36px);
}

.menu-button {
    top: var(--button-padding);
    right: var(--button-padding);
}

.next-button {
    top: calc(50% - 28px);
    right: var(--button-padding);
}

.prev-button {
    top: calc(50% - 28px);
    left: var(--button-padding);
}

.media-photo > * {
    width: 100%;
    height: 100%;
}

.right-pane {
    transition: margin-right 0.25s;
    margin-right: 0;
    padding: 20px;
    position: relative;
    display: block;
}

.info-header {
    display: flex;
    align-items: center;
}

.info-content {
    user-select: text;
}

.location-map {
    cursor: pointer;
    width: 100%;
    height: 350px;
    background-image: linear-gradient(to top right, #b2d5bf, #d3dce8);
    opacity: 0.8;
    border-radius: 15px;
}

</style>
