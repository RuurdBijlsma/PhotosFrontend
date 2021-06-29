<template>
    <v-carousel :continuous="false" class="carousel" :height="$vuetify.breakpoint.height" v-model="viewedItem">
        <v-carousel-item
            v-for="item in carouselItems"
            :key="item.id">
            <v-zoomer
                :max-scale="20"
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
        </v-carousel-item>
    </v-carousel>
</template>

<script lang="ts">
import Vue from 'vue'
import {api} from "@/ts/constants"
import {Media} from "@/ts/Media";

const carouselBuffer = 3;

export default Vue.extend({
    name: 'Photo',
    components: {},
    props: {},
    data: () => ({
        api,
        viewedItem: carouselBuffer,
        startSlice: 0,
        endSlice: 0,
    }),
    beforeDestroy() {
    },
    async mounted() {
        this.startSlice = Math.max(0, this.index - carouselBuffer);
        this.endSlice = this.index + 1 + carouselBuffer;
        this.viewedItem = this.index >= carouselBuffer ? carouselBuffer : this.index;
    },
    methods: {
        loadItems(direction: -1 | 1) {
            console.log('viewedItem changed', this.viewedItem, 'direction', direction);

            this.endSlice = this.endSlice + direction;
            this.startSlice = Math.max(0, this.startSlice + direction);
        },
    },
    computed: {
        carouselItems(): Media[] {
            let res = this.queue.slice(this.startSlice, this.endSlice);
            console.log('carouselItems', res, 'startSlice', this.startSlice, 'endSlice', this.endSlice);
            return res;
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
        queue(): Media[] {
            return this.$store.state.viewerQueue;
        },
        id(): string {
            return this.$route.params.id;
        },
    },
    watch: {
        viewedItem(oldVal: number, newVal: number) {
            this.loadItems((oldVal - newVal) as 1 | -1);
        },
    },
})
</script>

<style scoped>
.carousel {
    position: fixed;
    width: 100%;
    height: 100%;
    top: 0;
    left: 0;
    z-index: 6;
    background-color: black;
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
