<template>
    <swiper
        @slideChange="slideChange"
        @slideChangeTransitionEnd="transitionEnd"
        @slideNextTransitionStart="checkSpaceRight"
        @slidePrevTransitionEnd="checkSpaceLeft"
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
                    <v-img :lazy-src="`${api}/photo/tiny/${item.id}.webp`"
                           :src="`${api}/photo/big/${item.id}.webp`"
                           :key="item.id"
                           ref="image"
                           class="zoomer-image"
                           contain>
                    </v-img>
                </v-zoomer>
                <video class="element-item"
                       :poster="`${api}/photo/big/${item.id}.webp`"
                       controls
                       v-else-if="item"
                       autoplay
                       :src="`${api}/photo/webm/${item.id}.webm`">
                </video>
            </div>
        </swiper-slide>
    </swiper>
</template>

<script lang="ts">
import Vue from 'vue'
import {api} from "@/ts/constants"
import {Media} from "@/ts/Media";
import {Swiper, SwiperSlide} from 'vue-awesome-swiper'
import 'swiper/css/swiper.css'

const carouselBuffer = 3;

export default Vue.extend({
    name: 'Photo',
    components: {Swiper, SwiperSlide},
    props: {},
    data: () => ({
        api,
        viewedItem: 0,
        id: null as null | string,
        items: [] as Media[],
        startIndex: 0,
        endIndex: 0,
        swiperOption: {
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
    async mounted() {
        this.id = this.$route.params.id;
        this.swiper = (this.$refs.swiper as any).$swiper;

        this.startIndex = Math.max(0, this.index - carouselBuffer);
        this.endIndex = this.index + 1 + carouselBuffer;
        this.items = this.queue.slice(this.startIndex, this.endIndex);
        console.log("MOUNTED", this.items);
        let viewedItem = this.index >= carouselBuffer ? carouselBuffer : this.index;
        console.log('sliding to ', viewedItem);
        this.swiper.slideTo(viewedItem, 0, false);
    },
    methods: {
        slideChange() {
            console.log("Slide change", this.swiper.activeIndex);
            this.viewedItem = this.swiper.activeIndex;
            this.id = this.items[this.viewedItem].id;
        },
        transitionEnd() {
            console.log(this.id);
            // console.log("zoomers", this.$refs.zoomers);
            // Update relevant zoomer key
            // this.resetZoomer();
        },
        resetZoomer() {
            if (this.id !== null) {
                if (this.zoomerKeys.hasOwnProperty(this.id)) {
                    let keyVal: number = this.zoomerKeys[this.id];
                    Vue.set(this.zoomerKeys, this.id, keyVal + 1);
                } else {
                    Vue.set(this.zoomerKeys, this.id, 1);
                }
            }
        },
        checkSpaceLeft() {

            let bufferLeft = this.viewedItem;
            let bufferRight = this.items.length - this.viewedItem;
            if (bufferLeft < carouselBuffer) {
                console.log('Increasing buffer left');
                if (this.startIndex - 1 >= 0) {
                    this.startIndex--;
                    this.items.unshift(this.queue[this.startIndex]);
                    this.swiper.slideNext(0, false);
                    // this.$nextTick(() => this.resetZoomer());
                    if (bufferRight > carouselBuffer * 2) {
                        console.log("Removing item from end");
                        // this.endIndex--;
                        // this.items.splice(this.endIndex, 1);
                        // this.swiper.slidePrev(0, false);
                    }
                }
            }
        },
        checkSpaceRight() {
            let bufferLeft = this.viewedItem;
            let bufferRight = this.items.length - this.viewedItem;
            if (bufferRight < carouselBuffer) {
                console.log('Increasing buffer right');
                if (this.endIndex + 1 < this.queue.length) {
                    this.endIndex++;
                    this.items.push(this.queue[this.endIndex]);
                    // this.$nextTick(() => this.resetZoomer());
                    if (bufferLeft > carouselBuffer * 2) {
                        console.log("Removing item from start");
                        // this.startIndex++;
                        // this.items.splice(0, 1);
                        // this.swiper.slideNext(0, false);
                    }
                }
            }
        },
    },
    computed: {
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
    },
    watch: {
        index() {
            this.$store.commit('keepInView', this.queue[this.index]);
        },
        imgZoomed() {
            if (this.imgZoomed && !this.zoomedImgs.has(this.id)) {
                this.resetZoomer();
                this.zoomedImgs.add(this.id);
            }
            this.swiper.allowSlideNext = !this.imgZoomed;
            this.swiper.allowSlidePrev = !this.imgZoomed;
            this.swiper.allowTouchMove = !this.imgZoomed;
        },
    },
})
</script>

<style scoped>
.swiper {
    position: fixed;
    width: 100%;
    height: 100%;
    top: 0;
    left: 0;
    z-index: 6;
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
