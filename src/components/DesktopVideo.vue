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
        <v-sheet color="transparent" dark class="bottom-controls" :style="{
                opacity: showControls ? 1 : 0,
                pointerEvents: showControls ? 'all' : 'none',
            }">
            <v-btn class="ml-2" icon @click="togglePlay" dark>
                <v-icon v-if="playing">mdi-pause</v-icon>
                <v-icon v-else>mdi-play</v-icon>
            </v-btn>
            <div class="time-current" :style="{
                width: (timeHms.length + durationHms.length + 1) * 10 + 'px',
            }">
                {{ timeHms }} / {{ durationHms }}
            </div>

            <v-menu absolute nudge-left="30" nudge-top="30">
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
            <div @mouseenter="overControls=true"
                 @mouseleave="overControls=false"
                 @pointerdown="startMouse"
                 ref="seekField" class="seek-field">
                <v-sheet rounded class="seek-background" color="grey">
                    <v-sheet rounded color="white" class="seek-progress" :style="{
                        width: `calc(${progress * 100}% - 6px)`,
                    }"/>
                    <v-sheet color="white" class="seek-thumb" :style="{
                        left: `calc(${progress * 100}% - 6px)`,
                    }"/>
                </v-sheet>
            </div>
        </v-sheet>
        <video @dblclick="toggleFullscreen" @click="togglePlay()" ref="video" :src="src" :poster="poster"/>
    </div>
</template>

<script lang="ts">
import Vue, {PropType} from "vue";
import {secondsToHms} from "@/ts/utils";
import {Media} from "@/ts/Media";
import {api} from "@/ts/constants";

export default Vue.extend({
    name: 'DesktopVideo',
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
        video: {} as HTMLVideoElement,
        seekField: {} as HTMLElement,
        controlVideo: {} as HTMLElement,
        mouseMovedTimeout: -1,
        progress: 0,
        duration: 1,
        buffering: false,
        seekDown: false,
        tempShow: false,
        overControls: false,
        prevVolume: 1,
        isFullscreen: false,
    }),
    beforeDestroy() {
        clearTimeout(this.mouseMovedTimeout);
        this.video.removeEventListener('play', this.handlePlay);
        this.video.removeEventListener('pause', this.handlePause);
        this.video.removeEventListener('durationchange', this.handleDuration);
        this.video.removeEventListener('timeupdate', this.handleTime);
        this.video.removeEventListener('volumechange', this.handleVolume);
        this.video.removeEventListener('waiting', this.handleWaiting);
        this.video.removeEventListener('playing', this.handlePlaying);

        document.removeEventListener('mousemove', this.moveMouse);
        document.removeEventListener('mouseup', this.endMouse);
        document.removeEventListener('fullscreenchange', this.changeFullscreen);
        document.removeEventListener('keydown', this.handleKey);
    },
    mounted() {
        this.video = this.$refs.video as HTMLVideoElement;
        this.controlVideo = this.$refs.controlVideo as HTMLElement;
        this.seekField = this.$refs.seekField as HTMLElement;
        console.log(this.seekField);

        this.video.addEventListener('play', this.handlePlay);
        this.video.addEventListener('pause', this.handlePause);
        this.video.addEventListener('durationchange', this.handleDuration);
        this.video.addEventListener('timeupdate', this.handleTime);
        this.video.addEventListener('volumechange', this.handleVolume);
        this.video.addEventListener('waiting', this.handleWaiting);
        this.video.addEventListener('playing', this.handlePlaying);
        this.video.volume = this.videoVolume;

        document.addEventListener('mousemove', this.moveMouse, false);
        document.addEventListener('mouseup', this.endMouse, false);
        document.addEventListener('fullscreenchange', this.changeFullscreen, false);
        document.addEventListener('keydown', this.handleKey, false);

        this.activate();
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
        eventSeek({pageX = 0}) {
            let rect = this.seekField.getBoundingClientRect();
            let progress = (pageX - rect.left) / rect.width;
            this.video.currentTime = this.duration * progress;
            this.progress = progress;
        },
        startMouse(e: MouseEvent) {
            e.stopPropagation();
            console.log('start mouse');
            this.seekDown = true;
            this.eventSeek(e);
        },
        tempShowControls() {
            this.tempShow = true;
            clearTimeout(this.mouseMovedTimeout);
            this.mouseMovedTimeout = setTimeout(() => {
                if (!this.buffering)
                    this.tempShow = false;
            }, 1500);
        },
        moveMouse(e: MouseEvent) {
            this.tempShowControls();
            if (this.seekDown) {
                this.eventSeek(e);
            }
        },
        endMouse() {
            console.log('end');
            this.seekDown = false;
        },
        activate() {
            this.setMetadata();
        },
        loadImg(src: string): Promise<HTMLImageElement> {
            return new Promise(resolve => {
                let img = new Image;
                img.src = src;
                img.crossOrigin = "Anonymous";
                img.onload = () => resolve(img);
            });
        },
        async setMetadata() {
            if (!('mediaSession' in navigator))
                return;


            let sizes = ['small'];
            let images = await Promise.all(sizes.map(type => new Promise(async resolve => {
                let canvas = document.createElement('canvas');
                let context = canvas.getContext('2d') as CanvasRenderingContext2D;
                let url = `${api}/photo/${type}/${this.media.id}.webp`;
                let img = await this.loadImg(url);
                let size = 512;
                // noinspection JSSuspiciousNameCombination
                canvas.width = size;
                canvas.height = size;
                context.drawImage(img, 0, 0);
                resolve({size, url: canvas.toDataURL()});
                // canvas.toBlob(blob => {
                //     resolve({size, url: URL.createObjectURL(blob)});
                // });
            }))) as { size: number, url: string }[];
            console.log(images);
            let artwork = images.map(i => ({
                src: i.url,
                sizes: `${i.size}x${i.size}`,
                type: 'image/png',
            }));

            //@ts-ignore
            const mediaSession = navigator.mediaSession as any;
            console.log('media session', mediaSession);
            console.log('artwork', artwork);

            //@ts-ignore
            mediaSession.metadata = new MediaMetadata({
                artwork
            });

            let defaultSkipTime = 10;
            mediaSession.setActionHandler('seekbackward', (event: any) => {
                const skipTime = event.seekOffset || defaultSkipTime;
                this.video.currentTime -= skipTime;
            });

            mediaSession.setActionHandler('seekforward', (event: any) => {
                const skipTime = event.seekOffset || defaultSkipTime;
                this.video.currentTime += skipTime;
            });

            mediaSession.setActionHandler('play', () => {
                this.play();
            });

            mediaSession.setActionHandler('pause', () => {
                this.pause();
            });

            try {
                mediaSession.setActionHandler('stop', () => {
                    this.pause();
                });
            } catch (error) {
                console.warn('Warning! The "stop" media session action is not supported.');
            }

            try {
                mediaSession.setActionHandler('seekto', (event: any) => {
                    this.video.currentTime = event.seekTime;
                });
            } catch (error) {
                console.warn('Warning! The "seekto" media session action is not supported.');
            }
        },
        handleDuration() {
            this.duration = this.video.duration;
        },
        handleTime() {
            this.progress = this.video.currentTime / this.duration;

            if (this.duration !== Infinity && !isNaN(this.duration) && !isNaN(this.time) && this.time !== Infinity) {
                //@ts-ignore
                navigator?.mediaSession?.setPositionState?.({
                    duration: this.duration,
                    playbackRate: this.video.playbackRate,
                    position: this.time,
                });
            }
        },
        handleVolume() {
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
            this.video.play();
        },
        pause() {
            this.video.pause();
        },
        handlePlay() {
            this.tempShowControls();
            //@ts-ignore
            navigator.mediaSession.playbackState = 'playing';
            this.playing = true;
        },
        handlePause() {
            this.tempShowControls();
            //@ts-ignore
            navigator.mediaSession.playbackState = 'paused';
            this.playing = false;
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
        durationHms(): string {
            return secondsToHms(this.duration);
        },
        time(): number {
            return this.progress * this.duration;
        },
        timeHms(): string {
            return secondsToHms(this.time);
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
        '$route.params.id'() {
            console.log('id change, matches?', this.media.id === this.$route.params.id);
            if (this.isActive)
                this.activate();
        },
        videoVolume() {
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

.time-current {
    font-family: "Roboto", sans-serif;
    font-size: 14px;
    font-weight: 500;
    width: 80px;
    display: flex;
    align-items: center;
    padding: 0 5px 0 10px;
}

.seek-field {
    position: relative;
    flex-grow: 1;
    margin-right: 20px;
    height: 100%;
    display: flex;
    align-items: center;
    cursor: pointer;
}

.seek-field > * {
    pointer-events: none;
}

.seek-background {
    height: 4px;
    position: absolute;
    width: 100%;
}

.seek-progress {
    height: 4px;
    position: absolute;
}

.seek-thumb {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    position: absolute;
    margin-top: -4px;
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
