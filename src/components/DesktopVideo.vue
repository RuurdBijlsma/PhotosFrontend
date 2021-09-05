<template>
    <div class="control-video" ref="controlVideo" :style="{
        cursor: showControls ? 'inherit' : 'none',
    }">
        <div v-if="buffering" class="center-button" :style="{
                opacity: showControls ? 1 : 0,
                pointerEvents: showControls ? 'all' : 'none',
            }">
            <v-progress-circular size="52" width="2" color="white" dark indeterminate></v-progress-circular>
        </div>
        <div v-else class="center-button" :style="{
            opacity: `${1 - statusAnimation}`,
            transform: `scale(${1.5 * statusAnimation})`,
            transition: `${transitionTime}ms`,
        }">
            <v-icon large v-if="playing">mdi-play</v-icon>
            <v-icon large v-else>mdi-pause</v-icon>
        </div>
        <v-sheet color="transparent" dark class="bottom-controls"
                 @mouseenter="overControls=true"
                 @mouseleave="overControls=false"
                 :style="{
                opacity: showControls ? 1 : 0,
                pointerEvents: showControls ? 'all' : 'none',
            }">
            <v-btn class="ml-2" icon @click="togglePlay" dark>
                <v-icon v-if="playing">mdi-pause</v-icon>
                <v-icon v-else>mdi-play</v-icon>
            </v-btn>

            <v-menu absolute open-on-hover nudge-left="30" nudge-top="30">
                <template v-slot:activator="{ on, attrs }">
                    <v-btn icon dark class="mr-4"
                           v-bind="attrs"
                           v-on="on">
                        <v-icon v-if="videoVolume > 0.7">mdi-volume-high</v-icon>
                        <v-icon v-else-if="videoVolume > .3">mdi-volume-medium</v-icon>
                        <v-icon v-else-if="videoVolume > 0">mdi-volume-low</v-icon>
                        <v-icon v-else>mdi-volume-off</v-icon>
                    </v-btn>
                </template>
                <v-sheet dark class="volume-sheet">
                    <v-btn @click="toggleVolume" icon>
                        <v-icon v-if="videoVolume > 0.7">mdi-volume-high</v-icon>
                        <v-icon v-else-if="videoVolume > .3">mdi-volume-medium</v-icon>
                        <v-icon v-else-if="videoVolume > 0">mdi-volume-low</v-icon>
                        <v-icon v-else>mdi-volume-off</v-icon>
                    </v-btn>
                    <v-slider hide-details min="0" max="1" step="0.01" v-model="videoVolume"></v-slider>
                </v-sheet>
            </v-menu>
            <seek-bar class="seek-bar"
                      :active="isActive"
                      v-if="video && media"
                      :video="video"
                      :media="media"
                      @play="play"
                      @pause="pause"
                      @mousemove="tempShowControls"/>
        </v-sheet>
        <video @dblclick="toggleFullscreen" @click="togglePlay()" ref="video" :src="src" :poster="poster"/>
    </div>
</template>

<script lang="ts">
import Vue, {PropType} from "vue";
import {secondsToHms} from "@/ts/utils";
import {Media} from "@/ts/Media";
import {api} from "@/ts/constants";
import SeekBar from "@/components/SeekBar.vue";

export default Vue.extend({
    name: 'DesktopVideo',
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
        playing: false,
        video: null as HTMLVideoElement | null,
        controlVideo: {} as HTMLElement,
        mouseMovedTimeout: -1,
        buffering: false,
        tempShow: false,
        overControls: false,
        prevVolume: 1,
        isFullscreen: false,
        statusAnimation: 1, //set to 0 then to 1 to animate play pause status
        transitionTime: 0,
    }),
    beforeDestroy() {
        clearTimeout(this.mouseMovedTimeout);
        if (this.video) {
            this.video.removeEventListener('play', this.handlePlay);
            this.video.removeEventListener('pause', this.handlePause);
            this.video.removeEventListener('volumechange', this.handleVolume);
            this.video.removeEventListener('waiting', this.handleWaiting);
            this.video.removeEventListener('playing', this.handlePlaying);
        }

        document.removeEventListener('fullscreenchange', this.changeFullscreen);
        document.removeEventListener('keydown', this.handleKey);
    },
    mounted() {
        this.video = this.$refs.video as HTMLVideoElement;
        this.controlVideo = this.$refs.controlVideo as HTMLElement;

        this.video.addEventListener('play', this.handlePlay);
        this.video.addEventListener('pause', this.handlePause);
        this.video.addEventListener('volumechange', this.handleVolume);
        this.video.addEventListener('waiting', this.handleWaiting);
        this.video.addEventListener('playing', this.handlePlaying);
        this.video.volume = this.videoVolume;

        this.video.play();

        document.addEventListener('fullscreenchange', this.changeFullscreen, false);
        document.addEventListener('keydown', this.handleKey, false);
    },
    methods: {
        handleKey(e: KeyboardEvent) {
            if (e.key === ' ')
                this.togglePlay();
        },
        changeFullscreen() {
            if (this.isActive)
                this.$store.commit('videoFullscreen', document.fullscreenElement === this.$refs.controlVideo);
        },
        toggleFullscreen() {
            if (!document.fullscreenElement) {
                this.controlVideo.requestFullscreen();
            } else {
                document.exitFullscreen();
            }
        },
        toggleVolume() {
            if (this.videoVolume > 0) {
                this.prevVolume = this.videoVolume;
                this.videoVolume = 0;
            } else {
                this.videoVolume = this.prevVolume;
            }
        },
        tempShowControls() {
            this.tempShow = true;
            clearTimeout(this.mouseMovedTimeout);
            this.mouseMovedTimeout = setTimeout(() => {
                if (!this.buffering)
                    this.tempShow = false;
            }, 3500);
        },
        loadImg(src: string): Promise<HTMLImageElement> {
            return new Promise(resolve => {
                let img = new Image;
                img.src = src;
                img.crossOrigin = "Anonymous";
                img.onload = () => resolve(img);
            });
        },
        handleVolume() {
            if (this.video)
                this.videoVolume = this.video.volume;
        },
        handleWaiting() {
            this.buffering = true;
        },
        handlePlaying() {
            this.buffering = false;
        },
        togglePlay() {
            if (this.playing)
                this.pause();
            else
                this.play();
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
            this.showPlayStatus();
            this.tempShowControls();
            //@ts-ignore
            navigator.mediaSession.playbackState = 'playing';
            this.playing = true;
        },
        handlePause() {
            this.showPlayStatus();
            this.tempShowControls();
            //@ts-ignore
            navigator.mediaSession.playbackState = 'paused';
            this.playing = false;
        },
        async showPlayStatus() {
            this.transitionTime = 0;
            this.statusAnimation = 0;
            await this.$nextTick();
            this.transitionTime = 600;
            this.statusAnimation = 1;
        },
    },
    computed: {
        videoVolume: {
            set(v: number) {
                this.$store.commit('videoVolume', v);
            },
            get(): number {
                return this.$store.state.videoVolume;
            },
        },
        showControls(): boolean {
            return this.tempShow || !this.playing || this.overControls;
        },
        isActive(): boolean {
            return this.media.id === this.$route.params.id;
        },
    },
    watch: {
        buffering() {
            if (!this.buffering && this.tempShow)
                this.tempShowControls();
            this.tempShow = this.buffering;
        },
        showControls() {
            this.$store.commit('showPhotoButtons', this.showControls);
        },
        videoVolume() {
            if (this.video)
                this.video.volume = this.videoVolume;
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
    bottom: 63px;
    left: 0;
    z-index: 7;
    height: 36px;
    display: flex;
    align-items: center;
}

.seek-bar {
    position: relative;
    flex-grow: 1;
    height: 100%;
}

.volume-sheet {
    width: 150px;
    padding: 10px;
    display: flex;
    justify-content: space-between;
    overflow: hidden;
    align-items: center;
}
</style>
