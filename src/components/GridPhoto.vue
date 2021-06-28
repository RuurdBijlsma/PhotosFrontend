<template>
    <router-link class="photo"
                 :to="`${currentPath}/photo/${media.id}`"
                 :style="{
                    height: layoutMedia.visualHeight + 'px',
                    width: layoutMedia.visualWidth + 'px',
                    transform: selected ? `scale(0.92)` : null,
                    boxShadow: selected ? `0 0 0 20px #e1eff8, inset 0 0 0 3px #e1eff8` : null,
                 }">
        <div v-if="media.type === 'photo'"
             class="image-container">
            <div class="image-background"
                 :style="{backgroundImage: `url(${getThumbUrl(media.id, layoutMedia.visualHeight)})`}"/>
            <div class="image-overlay">
                <div class="image-info">
                    <v-btn class="zoom-button" if="isSelecting" color="white" small icon
                           v-if="isSelecting"
                           :to="`${currentPath}/photo/${media.id}`">
                        <v-icon class="icon">
                            mdi-magnify-plus-outline
                        </v-icon>
                    </v-btn>
                    <v-icon v-if="media.subType === 'vr'" class="icon" color="white">
                        mdi-rotate-3d-variant
                    </v-icon>
                    <v-icon v-else-if="media.subType === 'portrait'" class="icon" color="white">
                        mdi-blur
                    </v-icon>
                </div>
                <div class="item-select" @mousedown="selectItem($event)" @click.prevent="updateIsSelecting" :style="{
                    width: delayedIsSelecting ? '100%' : null,
                    height: delayedIsSelecting ? '100%' : null,
                    opacity: isSelecting ? '1 !important' : null,
                }">
                    <v-icon large class="icon" color="white" v-if="!isSelecting">
                        mdi-check-circle
                    </v-icon>
                    <v-icon x-large class="icon selected-icon" color="primary" v-else-if="selected">
                        mdi-check-circle
                    </v-icon>
                    <v-icon large class="icon" color="white" v-else>
                        mdi-circle-outline
                    </v-icon>
                </div>
            </div>
        </div>
        <div class="video-container" v-else
             @touchstart="playVideo"
             @touchend="pauseVideo"
             @mouseleave="pauseVideo()"
             @mouseenter="playVideo()">
            <video :poster="`${getThumbUrl(media.id, layoutMedia.visualHeight)}`"
                   muted loop
                   ref="video"
                   :src="`${api}/photo/webm/${media.id}.webm`"/>
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
                <div class="item-select" @mousedown="selectItem($event)" @click.prevent="updateIsSelecting" :style="{
                    width: delayedIsSelecting ? '100%' : null,
                    height: delayedIsSelecting ? '100%' : null,
                    opacity: isSelecting ? '1 !important' : null,
                }">
                    <v-icon large class="icon" color="white" v-if="!isSelecting">
                        mdi-check-circle
                    </v-icon>
                    <v-icon x-large class="icon selected-icon" color="primary" v-else-if="selected">
                        mdi-check-circle
                    </v-icon>
                    <v-icon large class="icon" color="white" v-else>
                        mdi-circle-outline
                    </v-icon>
                </div>
            </div>
        </div>
    </router-link>
</template>

<script lang="ts">
import Vue, {PropType} from 'vue'
import {api} from "@/ts/constants"
import {secondsToHms} from "@/ts/utils";
import {ILayoutMedia} from "@/ts/MediaInterfaces";
import {format} from "date-fns";

export default Vue.extend({
    name: 'GridPhoto',
    props: {
        layoutMedia: {type: Object as PropType<ILayoutMedia>, required: true},
    },
    data: () => ({
        api,
    }),
    methods: {
        updateIsSelecting() {
            this.delayedIsSelecting = this.$store.getters.isSelecting;
        },
        selectItem(e: MouseEvent) {
            this.$emit('selectItem', this.media, e.shiftKey);
        },
        playVideo() {
            let video = this.$refs.video as HTMLVideoElement;
            video?.play?.();
        },
        pauseVideo() {
            let video = this.$refs.video as HTMLVideoElement;
            video?.pause?.();
        },
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
            return `${api}/photo/${size}/${id}.webp`;
        },
        toHms(seconds: number) {
            return secondsToHms(seconds);
        },
    },
    computed: {
        delayedIsSelecting: {
            get(): boolean {
                return this.$store.state.delayedIsSelecting;
            },
            set(v: boolean) {
                this.$store.commit('delayedIsSelecting', v);
            },
        },
        isSelecting(): boolean {
            return this.$store.getters.isSelecting;
        },
        selected(): boolean {
            return this.$store.getters.isSelected(this.media.id);
        },
        themeColors() {
            let isDark = this.$vuetify.theme.dark;
            return this.$vuetify.theme.themes[isDark ? 'dark' : 'light'];
        },
        media() {
            return this.layoutMedia.media;
        },
        currentPath() {
            let path = this.$route.path;
            if (path.endsWith('/'))
                return path.substr(0, path.length - 1)
            return path;
        },
    },
    watch: {},
})
</script>

<style scoped>

.photo {
    display: inline-block;
    margin-bottom: -3px;
    background-color: rgba(128, 128, 128, 0.2);
    transition: 0.2s;
}

.photo:hover .item-select {
    opacity: 0.6 !important;
}

.photo:hover .zoom-button {
    opacity: 0.8 !important;
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
    border-radius: 1px;
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
    padding: 10px;
}

.item-select {
    position: absolute;
    padding: 10px;
    left: 0;
    top: 0;
    opacity: 0;
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
    padding: 10px;
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

.selected-icon {
    background-color: white;
    border-radius: 50%;
    font-size: 25px !important;
    text-shadow: none !important;
}

.zoom-button {
    z-index: 3;
    opacity: 0;
}
</style>
