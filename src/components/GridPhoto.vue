<template>
    <router-link class="photo"
                 :to="`${currentPath}/photo/${media.id}`"
                 :style="{
                    height: layoutMedia.visualHeight + 'px',
                    width: layoutMedia.visualWidth + 'px',
                 }">
        <div v-if="media.type === 'photo'"
             class="image-container">
            <div class="image-background"
                 :style="{backgroundImage: `url(${getThumbUrl(media.id, layoutMedia.visualHeight)})`}"/>
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
    data: () => ({api}),
    methods: {
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
    padding: 5px;
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
