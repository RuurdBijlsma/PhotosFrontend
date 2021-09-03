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
            <div class="time-current">
                {{ timeHms }}
            </div>
            <div ref="seekField" class="seek-field" @touchstart="startTouch" @mousedown="startMouse">
                <v-sheet rounded class="seek-background" color="grey">
                    <v-sheet rounded color="white" class="seek-progress" :style="{
                        width: `calc(${progress * 100}% - 6px)`,
                    }"/>
                    <v-sheet color="white" class="seek-thumb" :style="{
                        left: `calc(${progress * 100}% - 6px)`,
                    }"/>
                </v-sheet>
            </div>
            <div class="time-total">
                {{ durationHms }}
            </div>
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

export default Vue.extend({
    name: 'MobileVideo',
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
        video: {} as HTMLVideoElement,
        seekField: {} as HTMLElement,
        showTimeout: -1,
        playingTimeout: -1,
        progress: 0,
        duration: 1,
        buffering: false,
        seekDown: false,
    }),
    beforeDestroy() {
        clearTimeout(this.showTimeout);
        clearTimeout(this.playingTimeout);
        this.video.removeEventListener('play', this.handlePlay);
        this.video.removeEventListener('pause', this.handlePause);
        this.video.removeEventListener('durationchange', this.handleDuration);
        this.video.removeEventListener('timeupdate', this.handleTime);
        this.video.removeEventListener('volumechange', this.handleVolume);
        this.video.removeEventListener('waiting', this.handleWaiting);
        this.video.removeEventListener('playing', this.handlePlaying);

        document.removeEventListener('mousemove', this.moveMouse);
        document.removeEventListener('mouseup', this.endMouse);
        document.removeEventListener('touchend', this.endTouch);
    },
    mounted() {
        this.overrideHide = !this.$store.state.showPhotoButtons;
        this.video = this.$refs.video as HTMLVideoElement;
        this.seekField = this.$refs.seekField as HTMLElement;

        this.video.addEventListener('play', this.handlePlay);
        this.video.addEventListener('pause', this.handlePause);
        this.video.addEventListener('durationchange', this.handleDuration);
        this.video.addEventListener('timeupdate', this.handleTime);
        this.video.addEventListener('volumechange', this.handleVolume);
        this.video.addEventListener('waiting', this.handleWaiting);
        this.video.addEventListener('playing', this.handlePlaying);
        this.video.muted = this.videoMuted;

        document.addEventListener('mousemove', this.moveMouse, false);
        document.addEventListener('mouseup', this.endMouse, false);
        document.addEventListener('touchend', this.endTouch, false);

        this.activate();
    },
    methods: {
        eventSeek({pageX = 0}) {
            let rect = this.seekField.getBoundingClientRect();
            let progress = (pageX - rect.left) / rect.width;
            this.video.currentTime = this.duration * progress;
            this.progress = progress;
        },
        startMouse(e: MouseEvent) {
            e.stopPropagation();
            console.log('start');
            this.seekDown = true;
            this.eventSeek(e);
        },
        moveMouse(e: MouseEvent) {
            e.stopPropagation();
            if (this.seekDown) {
                console.log('move', e.pageX, this.seekDown, this.media.id);
                this.eventSeek(e);
            }
        },
        endMouse(e: MouseEvent) {
            e.stopPropagation();
            console.log('end');
            this.seekDown = false;
        },
        startTouch(e: TouchEvent) {
            e.stopPropagation();
            console.log('start');
            this.seekDown = true;
            this.eventSeek(e.touches[0]);
        },
        moveTouch(e: TouchEvent) {
            e.stopPropagation();
            if (this.seekDown) {
                console.log('move', e.touches[0].pageX, this.seekDown, this.media.id);
                this.eventSeek(e.touches[0]);
            }
        },
        endTouch(e: TouchEvent) {
            e.stopPropagation();
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
                // show controls if they were hidden
                this.overrideHide = false;
                this.overrideShow = true;
                clearTimeout(this.showTimeout);
                this.showTimeout = setTimeout(() => {
                    this.overrideShow = false;
                }, 2000);
            }
        },
        togglePlay() {
            if (this.playing) {
                this.pause();
            } else {
                this.play();
            }
        },
        play() {
            this.video.play();
        },
        pause() {
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
        videoMuted: {
            set(v: boolean) {
                this.$store.commit('videoMuted', v);
            },
            get(): boolean {
                return this.$store.state.videoMuted;
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
        '$route.params.id'() {
            console.log('id change, matches?', this.media.id === this.$route.params.id);
            if (this.media.id === this.$route.params.id)
                this.activate();
        },
        videoMuted() {
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

.time-current, .time-total {
    font-family: "Roboto", sans-serif;
    font-size: 14px;
    font-weight: 500;
    width: 50px;
    padding: 0 5px;
    display: flex;
    align-items: center;
}

.time-current {
    padding-left: 10px;
}

.time-total {
    text-align: right;
    justify-content: flex-end;
    padding-right: 10px;
}

.volume-button {
    margin-right: 10px;
}

.seek-field {
    position: relative;
    width: calc(100% - 150px);
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
</style>
