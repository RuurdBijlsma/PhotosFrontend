<template>
    <div class="seek-bar-container roboto">
        <div class="time-current" :style="{
                width: (timeHms.length + 1) * 10 + 'px',
            }">
            {{ timeHms }}
        </div>
        <div @pointerdown="startMouse" @touchstart="startTouch"
             ref="seekField" class="seek-field">
            <v-sheet rounded class="seek-background">
                <v-sheet
                    v-for="part in buffered"
                    :key="part.i"
                    class="buffer-progress"
                    color="primary lighten-2"
                    :style="{
                            width: `${(part.end - part.start) * 100}%`,
                            left: `${part.start * 100}%`,
                        }"/>
                <v-sheet rounded class="seek-progress" :style="{
                        width: `calc(${progress * 100}% - 6px)`,
                    }"/>
                <v-sheet color="white" class="seek-thumb" :style="{
                        left: `calc(${progress * 100}% - 6px)`,
                    }"/>
            </v-sheet>
        </div>
        <div class="time-total" :style="{
                width: (durationHms.length + 1) * 10 + 'px',
            }">
            {{ durationHms }}
        </div>
    </div>
</template>

<script lang="ts">
import Vue, {PropType} from "vue";
import {secondsToHms} from "@/ts/utils";
import {Media} from "@/ts/Media";
import {api} from "@/ts/constants";

export default Vue.extend({
    name: 'SeekBar',
    props: {
        media: {
            type: Object as PropType<Media>,
            required: true,
        },
        video: {
            type: Element as PropType<HTMLVideoElement>,
            required: true,
        },
        active: {
            type: Boolean,
            required: true,
        },
    },
    data: () => ({
        seekField: {} as HTMLElement,
        controlVideo: {} as HTMLElement,
        progress: 0,
        duration: 1,
        buffering: false,
        seekDown: false,
        buffered: [] as { i: number, start: number, end: number }[],
    }),
    beforeDestroy() {
        this.video.removeEventListener('durationchange', this.handleDuration);
        this.video.removeEventListener('timeupdate', this.handleTime);
        this.video.removeEventListener('progress', this.updateBuffered);

        document.addEventListener('touchmove', this.moveTouch);
        document.removeEventListener('mousemove', this.moveMouse);
        document.removeEventListener('mouseup', this.endMouse);
    },
    mounted() {
        this.controlVideo = this.$refs.controlVideo as HTMLElement;
        this.seekField = this.$refs.seekField as HTMLElement;
        this.updateBuffered();

        this.duration = this.video.duration;
        this.video.addEventListener('durationchange', this.handleDuration);
        this.video.addEventListener('timeupdate', this.handleTime);
        this.video.addEventListener('progress', this.updateBuffered);

        document.addEventListener('touchmove', this.moveTouch, false);
        document.addEventListener('mousemove', this.moveMouse, false);
        document.addEventListener('mouseup', this.endMouse, false);
        document.addEventListener('touchend', this.endTouch, false);

        if (this.active)
            this.activate();
    },
    methods: {
        updateBuffered() {
            this.buffered = [];
            if (!this.video.buffered) return;
            for (let i = 0; i < this.video.buffered.length; i++) {
                this.buffered.push({
                    i,
                    start: this.video.buffered.start(i) / this.video.duration,
                    end: this.video.buffered.end(i) / this.video.duration,
                });
            }
        },
        eventSeek({pageX = 0}) {
            let rect = this.seekField.getBoundingClientRect();
            let progress = (pageX - rect.left) / rect.width;
            this.setCurrentTime(this.duration * progress);
            this.progress = Math.max(0, Math.min(progress, 1));
            this.$emit('seeked');
        },
        startMouse(e: MouseEvent) {
            e.stopPropagation();
            console.log('start');
            this.seekDown = true;
            this.eventSeek(e);
        },
        moveMouse(e: MouseEvent) {
            this.$emit('mousemove');
            e.stopPropagation();
            if (this.seekDown) {
                this.eventSeek(e);
            }
        },
        endMouse(e: MouseEvent) {
            e.stopPropagation();
            this.seekDown = false;
        },
        startTouch(e: TouchEvent) {
            e.stopPropagation();
        },
        moveTouch(e: TouchEvent) {
            e.stopPropagation();
            if (this.seekDown) {
                this.eventSeek(e.touches[0]);
            }
        },
        endTouch(e: TouchEvent) {
            e.stopPropagation();
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
            let artwork = images.map(i => ({
                src: i.url,
                sizes: `${i.size}x${i.size}`,
                type: 'image/png',
            }));

            //@ts-ignore
            const mediaSession = navigator.mediaSession as any;

            //@ts-ignore
            mediaSession.metadata = new MediaMetadata({
                artwork
            });

            let defaultSkipTime = 10;
            mediaSession.setActionHandler('seekbackward', (event: any) => {
                const skipTime = event.seekOffset || defaultSkipTime;
                this.setCurrentTime(this.video.currentTime - skipTime);
            });

            mediaSession.setActionHandler('seekforward', (event: any) => {
                const skipTime = event.seekOffset || defaultSkipTime;
                this.setCurrentTime(this.video.currentTime + skipTime);
            });

            mediaSession.setActionHandler('play', () => {
                this.$emit('play');
            });

            mediaSession.setActionHandler('pause', () => {
                this.$emit('pause');
            });

            try {
                mediaSession.setActionHandler('stop', () => {
                    this.$emit('pause');
                });
            } catch (error) {
                console.warn('Warning! The "stop" media session action is not supported.');
            }

            try {
                mediaSession.setActionHandler('seekto', (event: any) => {
                    this.setCurrentTime(event.seekTime);
                });
            } catch (error) {
                console.warn('Warning! The "seekto" media session action is not supported.');
            }
        },
        setCurrentTime(time: number) {
            this.video.currentTime = Math.max(Math.min(this.video.duration, time), 0);
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
    },
    computed: {
        durationHms(): string {
            return secondsToHms(this.duration);
        },
        time(): number {
            return this.progress * this.duration;
        },
        timeHms(): string {
            return secondsToHms(this.time);
        },
    },
    watch: {
        seekDown() {
            this.$emit('seekDown', this.seekDown);
        },
        active() {
            if (this.active)
                this.activate();
        },
    },
})
</script>

<style scoped>
.seek-bar-container {
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

.seek-field {
    position: relative;
    flex-grow: 1;
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
    background-color: rgba(255, 255, 255, 0.3);
}

.seek-progress {
    height: 4px;
    position: absolute;
    background-color: rgba(255, 255, 255, 0.5);
}

.buffer-progress {
    position: absolute;
    height: 100%;
    background-color: rgb(130, 130, 192);
}

.seek-thumb {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    position: absolute;
    margin-top: -4px;
}
</style>
