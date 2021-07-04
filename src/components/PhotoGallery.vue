<template>
    <swiper
        @slideChange="slideChange"
        @slideChangeTransitionEnd="transitionEnd"
        @slideNextTransitionStart="checkSpaceRight"
        class="swiper" ref="swiper" :options="swiperOption">
        <swiper-slide v-for="item in items" :key="item.id">
            <div class="slide-container">
                <v-zoomer
                    :zoomed.sync="imgZoomed"
                    :max-scale="20"
                    :key="zoomerKeys[item.id]"
                    ref="zoomers"
                    :zooming-elastic="false"
                    class="element-item"
                    v-if="item && item.type === 'photo'">
                    <v-img :lazy-src="`${api}/photo/tiny/${id}.webp`"
                           :src="imgSrc(item.id, zoomedImgs.has(id))"
                           :key="imgSrc(item.id, zoomedImgs.has(id))"
                           :transition="'none'"
                           ref="image"
                           class="zoomer-image"
                           contain>
                    </v-img>
                </v-zoomer>
                <video class="element-item"
                       :ref="`video${item.id}`"
                       :poster="`${api}/photo/big/${item.id}.webp`"
                       controls
                       v-else-if="item"
                       :src="`${api}/photo/webm/${item.id}.webm`">
                </video>
            </div>
        </swiper-slide>
    </swiper>
</template>

<script lang="ts">
import Vue, {PropType} from 'vue'
import {api} from "@/ts/constants"
import {Media} from "@/ts/Media";
import {Swiper, SwiperSlide} from 'vue-awesome-swiper'
import 'swiper/css/swiper.css'
import {isTouchDevice} from "@/ts/utils";

const carouselBuffer = 3;

export default Vue.extend({
    name: 'PhotoGallery',
    components: {Swiper, SwiperSlide},
    props: {
        queue: {
            type: [] as PropType<Media[]>,
        },
    },
    data: () => ({
        changeUrlTimeout: -1,
        allowTouch: true,
        api,
        viewedItem: 0,
        id: null as null | string,
        items: [] as Media[],
        startIndex: 0,
        swiperOption: {
            spaceBetween: 5,
            zoom: true,
            lazy: true,
            keyboard: {
                enabled: true,
            },
        },
        zoomerKeys: {} as any,
        zoomedImgs: new Set(),
        swiper: null as any,
        imgZoomed: false,
    }),
    mounted() {
        this.id = this.$route.params.id;
        this.swiper = (this.$refs.swiper as any).$swiper;
        this.swiper.resizeObserver = true;
        // window.swiper = this.swiper;

        if (this.queue.length > 0)
            this.initialize();
    },
    methods: {
        initialize() {
            this.startIndex = Math.max(0, this.index - carouselBuffer);
            this.items = this.queue.slice(this.startIndex, this.startIndex + carouselBuffer * 2 + 1);
            let viewedItem = this.index >= carouselBuffer ? carouselBuffer : this.index;
            this.swiper.slideTo(viewedItem, 0, false);
        },
        slideChange() {
            this.viewedItem = this.swiper.activeIndex;
            this.id = this.items[this.viewedItem].id;
        },
        resetZoomer() {
            console.log('resetzoomer, is touch device?', isTouchDevice())
            if (this.id !== null) {
                if (this.zoomerKeys.hasOwnProperty(this.id)) {
                    let keyVal: number = this.zoomerKeys[this.id];
                    Vue.set(this.zoomerKeys, this.id, keyVal + 1);
                } else {
                    Vue.set(this.zoomerKeys, this.id, 1);
                }
            }
        },
        transitionEnd() {
            let bufferLeft = this.viewedItem;
            let bufferRight = this.items.length - this.viewedItem;
            if (bufferLeft > carouselBuffer * 7) {
                this.allowTouch = false;
                let deleteCount = bufferLeft - carouselBuffer;
                this.startIndex += deleteCount;
                this.items.splice(0, deleteCount);
                console.log(`Buffer left too large, deleting first ${deleteCount} slides`);
                this.swiper.slideTo(this.viewedItem - deleteCount, 0, false);
                setTimeout(() => this.allowTouch = true, 150);
            } else if (bufferLeft < carouselBuffer) {
                if (this.startIndex - 1 >= 0) {
                    this.allowTouch = false;
                    let addCount = carouselBuffer * 2 - bufferLeft;
                    let addItems = this.queue.slice(Math.max(this.startIndex - addCount, 0), this.startIndex);
                    console.log(`Increasing buffer left by ${addItems.length}`);
                    this.startIndex -= addItems.length;
                    this.items.unshift(...addItems);
                    this.swiper.slideTo(this.viewedItem + addItems.length, 0, false);
                    setTimeout(() => this.allowTouch = true, 150);
                }
            }
            if (bufferRight > carouselBuffer * 7) {
                this.allowTouch = false;
                let deleteCount = bufferRight - carouselBuffer;
                console.log(`Buffer right too large, deleting last ${deleteCount} slides`, this.items);
                this.items.splice(this.items.length - deleteCount, deleteCount);
                // this.swiper.slideTo(this.viewedItem - deleteCount, 0, false);
                setTimeout(() => this.allowTouch = true, 150);
            }
        },
        checkSpaceRight() {
            let bufferRight = this.items.length - this.viewedItem;
            if (bufferRight < carouselBuffer) {
                if (this.endIndex + 1 < this.queue.length) {
                    let addCount = carouselBuffer * 2 - bufferRight;
                    let addItems = this.queue.slice(this.endIndex + 1, this.endIndex + addCount + 1);
                    console.log(`Increasing buffer right by ${addItems.length}`);
                    this.items.push(...addItems);
                }
            }
        },
        imgSrc(id: string, hasZoomed: boolean): string {
            if ((this.imgZoomed || hasZoomed) && !isTouchDevice()) {
                return `${api}/photos/full/${id}`
            }
            return `${api}/photo/big/${id}.webp`
        },
    },
    computed: {
        endIndex(): number {
            return this.startIndex + this.items.length;
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
    },
    watch: {
        queue() {
            this.initialize();
        },
        allowTouch() {
            this.swiper.allowSlideNext = this.allowTouch;
            this.swiper.allowSlidePrev = this.allowTouch;
            this.swiper.allowTouchMove = this.allowTouch;
        },
        index() {
            this.$store.commit('keepInView', this.queue[this.index]);
        },
        imgZoomed() {
            if (this.imgZoomed && !this.zoomedImgs.has(this.id)) {
                if (!isTouchDevice()) {
                    console.log("this is not a touch device, resetting zoomer on zoom in")
                    this.resetZoomer();
                }
                this.zoomedImgs.add(this.id);
            }
            this.allowTouch = !this.imgZoomed;
        },
        id(newVal, oldVal) {
            if (newVal === oldVal) return;
            // If switching away from video, pause video
            let vid = this.$refs['video' + oldVal] as HTMLVideoElement[] | undefined;
            if (vid)
                vid[0].pause();

            if (this.id && this.$route.path.includes(this.id)) return;
            let path = this.$route.path.split('/').filter(p => p.length !== 0);
            //@ts-ignore
            path[path.length - 1] = this.id;
            clearTimeout(this.changeUrlTimeout);
            this.changeUrlTimeout = setTimeout(() => {
                requestAnimationFrame(() => {
                    this.$router.replace(`/${path.join('/')}`);
                });
            }, 150);
        },
    },
})
</script>

<style scoped>
.swiper {
    background-color: black;
}

.slide-container {
    position: relative;
    width: 100%;
    height: 100%;
}

.element-item {
    width: 100%;
    height: 100%;
}

.zoomer-image {
    width: 100%;
    height: 100%;
}
</style>
