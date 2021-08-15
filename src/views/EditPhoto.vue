<template>
    <v-sheet dark class="edit-photo" v-if="id">
        <div class="controls">
            <div class="controls-left">
                <v-btn class="mr-3" icon :to="prevUrl" exact title="Go back">
                    <v-icon>mdi-arrow-left</v-icon>
                </v-btn>
                <v-btn icon dark @click="hiddenAngle -= Math.PI / 2" title="Rotate left">
                    <v-icon>mdi-rotate-left</v-icon>
                </v-btn>
                <v-btn icon dark @click="hiddenAngle += Math.PI / 2" title="Rotate right">
                    <v-icon>mdi-rotate-right</v-icon>
                </v-btn>
                <v-btn text dark @click="resetAngle" title="Reset rotation">
                    Reset
                </v-btn>
                <div class="slider-stuff">
                    <span class="degrees-text">{{ degrees }}°</span>
                    <v-btn icon @click="angle -= 0.00174532925" class="ml-1 mr-1">
                        <v-icon>mdi-minus</v-icon>
                    </v-btn>
                    <v-slider hide-details class="slider"
                              @wheel.native="handleWheel"
                              :min="-0.34906585"
                              :max="0.34906585"
                              step="0.00174532925"
                              v-model="angle"/>
                    <v-btn icon @click="angle += 0.00174532925" class="ml-1 mr-1">
                        <v-icon>mdi-plus</v-icon>
                    </v-btn>
                </div>
            </div>
            <div class="controls-right">
                <v-btn text @click="save(false)" v-show="!loading">
                    <v-icon class="mr-2" small>mdi-content-save</v-icon>
                    Save
                </v-btn>
                <v-btn text @click="save(true)" :loading="loading">
                    <v-icon class="mr-2" small>mdi-content-save</v-icon>
                    Save copy
                </v-btn>
            </div>
        </div>
        <canvas class="canvas" ref="canvas"/>
    </v-sheet>
</template>

<script lang="ts">
import Vue from 'vue'
import {api} from "@/ts/constants";
import {Media} from "@/ts/Media";

export default Vue.extend({
    name: 'EditPhoto',
    components: {},
    data: () => ({
        loading: false,
        hiddenAngle: 0,
        angle: 0,
        api,
        canvas: null as HTMLCanvasElement | null,
        context: null as CanvasRenderingContext2D | null,
        img: null as HTMLImageElement | null,
    }),
    async mounted() {
        this.canvas = this.$refs.canvas as HTMLCanvasElement;
        this.context = this.canvas.getContext('2d');
        this.img = new Image();
        this.img.src = `${api}/photo/big/${this.id}.webp`;
        this.img.onload = () => this.setRotation(this.angle);
    },
    methods: {
        async save(copy = true) {
            this.loading = true;
            let {id, success} = await this.$store.dispatch('apiRequest', {
                url: 'photos/rotateImage',
                body: {id: this.id, angle: (this.angle + this.hiddenAngle) % (Math.PI * 2), copy},
            });
            this.loading = false;
            if (success) {
                // let media = await this.$store.dispatch('apiRequest', {url: `photos/${id}`}).then(Media.fromObject);
                location.href = location.href.substr(0, location.href.length - 5).replace(this.id, id);
            } else {
                await this.$store.dispatch('addSnack', {text: `Couldn't rotate image!`});
            }
        },
        handleWheel(e: WheelEvent) {
            console.log(e.deltaY);
            this.angle += (e.deltaY / -100) * 0.00174532925;
        },
        drawGrid() {
            if (this.img === null || this.context === null || this.canvas === null) return;
            let ratio = this.canvas.width / this.canvas.height;
            let horizontalLines = Math.round(12 / ratio);
            let verticalLines = Math.round(12);
            let xSpacing = this.canvas.width / (verticalLines + 1);
            let ySpacing = this.canvas.height / (horizontalLines + 1);
            console.log({verticalLines, horizontalLines})
            for (let i = 0; i < horizontalLines; i++) {
                this.context.moveTo(0, (i + 1) * ySpacing);
                this.context.lineTo(this.canvas.width, (i + 1) * ySpacing);
            }
            for (let i = 0; i < verticalLines; i++) {
                this.context.moveTo((i + 1) * xSpacing, 0);
                this.context.lineTo((i + 1) * xSpacing, this.canvas.height);
            }
            this.context.strokeStyle = 'rgba(128,128,128,0.9)';
            this.context.lineWidth = 2;
            this.context.stroke();
        },
        resetAngle() {
            this.angle = 0;
            this.hiddenAngle = 0;
        },
        setRotation(radians: number) {
            if (this.img === null || this.context === null || this.canvas === null) return;

            let cc = this.getCropCoordinates(radians, {w: this.img.width, h: this.img.height});
            this.canvas.width = cc.w;
            this.canvas.height = cc.h;
            let windowRatio = window.innerWidth / window.innerHeight;
            let cRatio = cc.w / cc.h;
            // if window is wider than canvas
            if (windowRatio > cRatio) {
                // set canvas height to window height and calculate canvas width
                let visualCanvasWidth = window.innerHeight * cRatio;
                this.canvas.style.left = (window.innerWidth - visualCanvasWidth) / 2 + 'px';
                this.canvas.style.top = '0';
                this.canvas.style.height = window.innerHeight + 'px';
                this.canvas.style.width = visualCanvasWidth + 'px';
            } else {
                let visualCanvasHeight = window.innerWidth / cRatio;
                this.canvas.style.left = '0';
                this.canvas.style.top = (window.innerHeight - visualCanvasHeight) / 2 + 'px';
                this.canvas.style.height = visualCanvasHeight + 'px';
                this.canvas.style.width = window.innerWidth + 'px';
            }
            console.log(cc);

            this.drawImage(this.context, this.img, cc.x, cc.y, radians);
            this.drawGrid();
        },
        drawImage(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, angle = 0) {
            ctx.translate(ctx.canvas.width / 2, ctx.canvas.height / 2);
            ctx.rotate(angle);
            ctx.drawImage(img, -img.width / 2, -img.height / 2, img.width, img.height);
            ctx.rotate(-angle);
            ctx.translate(-ctx.canvas.width / 2, -ctx.canvas.height / 2);
        },
        getCropCoordinates(angleInRadians: number, imageDimensions: { w: number, h: number }): { x: number, y: number, w: number, h: number } {
            const ang = angleInRadians;
            const img = imageDimensions;

            const quadrant = Math.floor(ang / (Math.PI / 2)) & 3;
            const sign_alpha = (quadrant & 1) === 0 ? ang : Math.PI - ang;
            const alpha = (sign_alpha % Math.PI + Math.PI) % Math.PI;

            const bb = {
                w: img.w * Math.cos(alpha) + img.h * Math.sin(alpha),
                h: img.w * Math.sin(alpha) + img.h * Math.cos(alpha)
            };

            const gamma = img.w < img.h ? Math.atan2(bb.w, bb.h) : Math.atan2(bb.h, bb.w);

            const delta = Math.PI - alpha - gamma;

            const length = img.w < img.h ? img.h : img.w;
            const d = length * Math.cos(alpha);
            const a = d * Math.sin(alpha) / Math.sin(delta);

            const y = a * Math.cos(gamma);
            const x = y * Math.tan(gamma);

            return {
                x: Math.round(x),
                y: Math.round(y),
                w: Math.round(bb.w - 2 * x),
                h: Math.round(bb.h - 2 * y),
            };
        },
    },
    computed: {
        degrees() {
            return Math.round(this.angle * 180 / Math.PI * 100) / 100;
        },
        id() {
            return this.$route.params.id;
        },
        prevUrl() {
            let parts = this.$route.path.split('/');
            return parts.slice(0, parts.length - 1).join('/');
        },
    },
    watch: {
        hiddenAngle() {
            this.setRotation(this.hiddenAngle + this.angle);
        },
        angle() {
            this.setRotation(this.hiddenAngle + this.angle);
        },
    },
})
</script>

<style scoped>
.edit-photo {
    position: fixed;
    width: 100%;
    height: 100%;
    z-index: 10;
    top: 0;
    left: 0;
}

.canvas {
    position: absolute;
}

.controls {
    position: absolute;
    display: flex;
    justify-content: space-between;
    width: 100%;
    padding: 12px;
    z-index: 12;
    background-color: rgba(0, 0, 0, 0.5);
    flex-wrap: wrap;
}

.controls > * {
    display: flex;
}

.controls-left {
    flex-grow: 1;
}

.controls-left > * {
    margin: 0 10px;
}

.slider {
    max-width: 200px;
}

.slider-stuff {
    display: flex;
    width: 300px;
    align-items: center;
}

.degrees-text {
    width: 45px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
</style>
