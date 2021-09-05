<template>
    <div class="control-video">
        <div v-if="buffering" class="center-button" :style="{
                opacity: showControls ? 1 : 0,
                pointerEvents: showControls ? 'all' : 'none',
            }">
            <v-progress-circular size="52" width="2" color="white" dark indeterminate></v-progress-circular>
        </div>
        <div v-else class="center-button" :style="{
                opacity: showControls ? 1 : 0,
                pointerEvents: showControls ? 'all' : 'none',
            }">
            <v-btn outlined x-large icon @click="togglePlay" dark>
                <v-icon v-if="playing">mdi-pause</v-icon>
                <v-icon v-else>mdi-play</v-icon>
            </v-btn>
        </div>
        <v-sheet color="transparent" dark class="bottom-controls" :style="{
                opacity: showControls ? 1 : 0,
                pointerEvents: showControls ? 'all' : 'none',
            }">
            <seek-bar class="seek-bar"
                      :active="isActive"
                      v-if="video && media"
                      :video="video"
                      :media="media"
                      @seeked="tempShowControls"
                      @seekDown="seekDown=$event"
                      @play="play"
                      @pause="pause"/>
            <v-btn icon dark class="volume-button" @click="videoMuted = !videoMuted">
                <v-icon v-if="!videoMuted">mdi-volume-high</v-icon>
                <v-icon v-else>mdi-volume-off</v-icon>
            </v-btn>
        </v-sheet>
        <video @click="tempToggleControls()" ref="video" :src="src" :poster="poster"/>
    </div>
</template>

<script lang="ts">
import Vue, {PropType} from "vue";
import {secondsToHms} from "@/ts/utils";
import {Media} from "@/ts/Media";
import {api} from "@/ts/constants";
import SeekBar from "@/components/SeekBar.vue";

export default Vue.extend({
    name: 'MobileVideo',
    components: {SeekBar},
    props: {
        media: {
            type: Object as PropType<Media>,
            required: true,
        },
        poster: {
            type: String,
            required: true,
        },
        src: {
            type: String,
            required: true,
        },
    },
    data: () => ({
        delayedPlaying: false,
        overrideShow: false,
        overrideHide: false,
        playing: false,
        video: null as null | HTMLVideoElement,
        showTimeout: -1,
        playingTimeout: -1,
        buffering: false,
        seekDown: false,
    }),
    beforeDestroy() {
        clearTimeout(this.showTimeout);
        clearTimeout(this.playingTimeout);
        if (this.video) {
            this.video.removeEventListener('play', this.handlePlay);
            this.video.removeEventListener('pause', this.handlePause);
            this.video.removeEventListener('volumechange', this.handleVolume);
            this.video.removeEventListener('waiting', this.handleWaiting);
            this.video.removeEventListener('playing', this.handlePlaying);
        }
    },
    mounted() {
        this.overrideHide = !this.$store.state.showPhotoButtons;
        this.video = this.$refs.video as HTMLVideoElement;

        this.video.addEventListener('play', this.handlePlay);
        this.video.addEventListener('pause', this.handlePause);
        this.video.addEventListener('volumechange', this.handleVolume);
        this.video.addEventListener('waiting', this.handleWaiting);
        this.video.addEventListener('playing', this.handlePlaying);
        this.video.muted = this.videoMuted;
    },
    methods: {
        handleVolume() {
            if (this.video)
                this.videoMuted = this.video.muted;
        },
        handleWaiting() {
            this.buffering = true;
        },
        handlePlaying() {
            this.buffering = false;
        },
        tempToggleControls() {
            if (this.showControls) {
                // hide controls if they were shown
                this.overrideHide = !this.overrideHide;
            } else {
                this.tempShowControls();
            }
        },
        tempShowControls() {
            // show controls if they were hidden
            this.overrideHide = false;
            this.overrideShow = true;
            clearTimeout(this.showTimeout);
            this.showTimeout = setTimeout(() => {
                this.overrideShow = false;
            }, 3500);
        },
        togglePlay() {
            if (this.playing) {
                this.pause();
            } else {
                this.play();
            }
        },
        play() {
            if (this.video)
                this.video.play();
        },
        pause() {
            if (this.video)
                this.video.pause();
        },
        handlePlay() {
            //@ts-ignore
            navigator.mediaSession.playbackState = 'playing';
            this.playing = true;
            clearTimeout(this.playingTimeout);
            this.playingTimeout = setTimeout(() => {
                this.delayedPlaying = true;
            }, 2000);
        },
        handlePause() {
            //@ts-ignore
            navigator.mediaSession.playbackState = 'paused';
            this.playing = false;
            clearTimeout(this.playingTimeout);
            this.delayedPlaying = false;
        },
    },
    computed: {
        isActive(): boolean {
            return this.media.id === this.$route.params.id;
        },
        videoMuted: {
            set(v: boolean) {
                this.$store.commit('videoMuted', v);
            },
            get(): boolean {
                return this.$store.state.videoMuted;
            },
        },
        showControls() {
            if (this.buffering)
                return true;
            if (this.seekDown)
                return true;
            if (this.overrideHide)
                return false;
            if (this.overrideShow)
                return true;
            if (!this.delayedPlaying)
                return true;
            return false;
        },
    },
    watch: {
        videoMuted() {
            if (this.video)
                this.video.muted = this.videoMuted;
        },
        '$store.state.showPhotoButtons'() {
            this.overrideHide = !this.$store.state.showPhotoButtons;
        },
        showControls() {
            this.$store.commit('showPhotoButtons', this.showControls);
        },
    },
})
</script>

<style scoped>
.control-video {
    position: relative;
}

.control-video video {
    width: 100%;
    height: 100%;
    z-index: 6;
    position: absolute;
    top: 0;
    left: 0;
}

.center-button {
    transition: opacity .5s;
    background-color: rgba(0, 0, 0, 0.1);
    border-radius: 50%;
    width: 52px;
    height: 52px;
    left: calc(50% - 26px);
    top: calc(50% - 26px);
    transform-origin: center;

    position: absolute;
    display: flex;
    place-content: center;
    place-items: center;
    z-index: 7;
}

.bottom-controls {
    position: absolute;
    width: 100%;
    bottom: 0;
    padding-bottom: 120px;
    left: 0;
    z-index: 7;
    height: 36px;
    display: flex;
    align-items: center;
}

.volume-button {
    margin-right: 10px;
}

.seek-bar {
    position: relative;
    flex-grow: 1;
    height: 100%;
}
</style>
