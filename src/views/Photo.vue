<template>
    <div class="media-photo">
        <div class="left-pane">
            <div class="controls">
                <div class="control-top">
                    <div class="control-top-left">
                        <v-btn large icon dark @click="close">
                            <v-icon>mdi-arrow-left</v-icon>
                        </v-btn>
                    </div>
                    <div class="control-top-right">
                        <v-btn large icon dark @click="showInfo = !showInfo">
                            <v-icon>mdi-information-outline</v-icon>
                        </v-btn>
                    </div>
                </div>
                <div class="control-mid">
                    <v-btn fab dark :disabled="!canSkipLeft" @click="previous">
                        <v-icon>mdi-chevron-left</v-icon>
                    </v-btn>
                    <v-btn fab dark :disabled="!canSkipRight" @click="next">
                        <v-icon>mdi-chevron-right</v-icon>
                    </v-btn>
                </div>
            </div>
            <v-img
                :lazy-src="`${api}/photos/tiny/${media.id}.webp`"
                :src="`${api}/photos/big/${media.id}.webp`"
                :key="media.id"
                class="media-item"
                contain
                v-if="media && media.type === 'photo'"/>
            <video class="media-item" :poster="`${api}/photos/big/${media.id}.webp`"
                   controls
                   autoplay
                   :ref="`video${media.id}`" v-else-if="media"
                   :src="`${api}/photos/webm/${media.id}.webm`"></video>
        </div>
        <v-sheet class="right-pane" :style="{
            marginRight: showInfo ? '0' : '-400px',
        }" :key="loadInfo">
            <div class="info-header">
                <v-btn @click="showInfo = false" icon>
                    <v-icon>mdi-close</v-icon>
                </v-btn>
                <span>Info</span>
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
                                :nudge-left="50"
                                min-width="auto">
                                <template v-slot:activator="{ on, attrs }">
                                    <span class="mr-4" v-bind="attrs" v-on="on">{{ createDate }}</span>
                                </template>
                                <v-date-picker
                                    max-width="360"
                                    v-model="createDate"
                                    :max="new Date().toISOString().substr(0, 10)"
                                    min="1950-01-01"/>
                            </v-menu>
                            <v-menu
                                :close-on-content-click="false"
                                transition="scale-transition"
                                offset-y
                                :nudge-left="90"
                                min-width="auto">
                                <template v-slot:activator="{ on, attrs }">
                                    <span v-bind="attrs" v-on="on">{{ createTime }}</span>
                                </template>
                                <v-time-picker
                                    format="24hr"
                                    use-seconds
                                    scrollable
                                    v-model="createTime"
                                    max-width="360"/>
                            </v-menu>
                        </v-list-item-title>
                        <v-list-item-subtitle>Date taken</v-list-item-subtitle>
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
                                <v-icon>mdi-graph</v-icon>
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
                        <v-list-item two-line v-for="(classification, i) in classifications">
                            <v-list-item-avatar>
                                <v-icon>mdi-alpha-{{ 'abcdefg'[i] }}-circle-outline</v-icon>
                            </v-list-item-avatar>
                            <v-list-item-content>
                                <v-list-item-title :title="classifications[0].labels">
                                    {{ classification.labels }}
                                </v-list-item-title>
                                <v-list-item-subtitle :title="classification.glossary">
                                    {{ classification.glossary }}
                                </v-list-item-subtitle>
                            </v-list-item-content>
                        </v-list-item>
                    </v-list>
                </v-menu>
                <v-list-item two-line v-if="media.location">
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
        </v-sheet>
    </div>
</template>

<script lang="ts">
import Vue from 'vue'
import {api} from "@/ts/constants"
import {Media} from "@/ts/Media";
import {bytesToReadable} from "@/ts/utils";

export default Vue.extend({
    name: 'Photo',
    props: {},
    data: () => ({
        api,
        media: null as Media | null,
        isLoading: new Set(),
        loadInfo: 0,
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
            console.log(path);
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
        async fullMediaLoad() {
            let id = this.media?.id ?? this.id;
            if (this.isLoading.has(id))
                return;
            this.isLoading.add(id);

            let media = await this.$store.dispatch('apiRequest', {url: `photos/${id}`}).then(Media.fromObject);
            if (this.media === null || id === this.media?.id) {
                console.log(media);
                this.media = media;
                this.loadInfo++;
            }
            this.isLoading.delete(id);
        },
        waitSleep(ms = 1000) {
            return new Promise(resolve => setTimeout(resolve, ms));
        },
    },
    computed: {
        classifications(): { labels: string, glossary: string }[] | null {
            let classification = this.media?.classifications ?? null;
            if (classification === null)
                return null;
            const capitalize = (s: string) => s.substr(0, 1).toUpperCase() + s.substr(1);
            return classification.map(c => ({
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
        subPlace(): string|null{
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
        createTime: {
            get(): string {
                let date = this.media?.createDate ?? new Date();
                let hours = date.getHours().toString().padStart(2, '0');
                let minutes = date.getMinutes().toString().padStart(2, '0');
                let seconds = date.getSeconds().toString().padStart(2, '0');
                return `${hours}:${minutes}:${seconds}`;
            },
            set(v: string) {
                console.log('set time', v);
            }
        },
        createDate: {
            get(): string {
                let date = this.media?.createDate ?? new Date();
                let month = (date.getMonth() + 1).toString().padStart(2, '0');
                let day = date.getDate().toString().padStart(2, '0');
                return `${date.getFullYear()}-${month}-${day}`;
            },
            set(v: string) {
                console.log('set date', v);
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
        id() {
            this.fullMediaLoad();
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
}

.left-pane {
    position: relative;
}

.controls {
    width: 100%;
    height: 100%;
    z-index: 6;
    position: absolute;
    display: flex;
    flex-direction: column;
    padding: 15px 25px;
    background-image: linear-gradient(to bottom, rgba(0, 0, 0, 0.7) 0%, transparent 10%);
}

.control-top {
    width: 100%;
    display: flex;
    justify-content: space-between;
}

.control-mid {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-grow: 1;
}

.media-item {
    position: absolute;
    width: 100%;
    height: 100%;
}

.media-div {
    background-repeat: no-repeat;
    background-size: contain;
    background-position: center;
    width: 100%;
    height: 100%;
}

.media-photo > * {
    width: 100%;
    height: 100%;
}

.media-item {
    background-position: center;
    background-size: contain;
    background-color: black;
}

.right-pane {
    transition: margin-right 0.25s;
    width: 400px;
    max-width: 400px;
    min-width: 400px;
    margin-right: 0;
    padding: 20px;
}

.info-content {
    user-select: text;
}

.subheader-caption {
    font-size: 11px;
    text-transform: uppercase;
}

</style>
