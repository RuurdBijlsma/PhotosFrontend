<template>
    <div>
        <swiper class="swiper" ref="swiper" :options="swiperOption">
            <swiper-slide v-for="id in ids" :key="id">
                <v-img :lazy-src="`${api}/photo/tiny/${id}.webp`" :src="`${api}/photo/big/${id}.webp`"
                       class="swiper-lazy"/>
            </swiper-slide>
        </swiper>
        <v-btn @click="appendPhoto">Append</v-btn>
        <v-btn @click="prependPhoto">Prepend</v-btn>
    </div>
</template>

<script>
import {Swiper, SwiperSlide} from 'vue-awesome-swiper'
import 'swiper/css/swiper.css'
import {api} from "@/ts/constants";

export default {
    name: 'Photo3',
    title: 'Lazy loading images',
    components: {
        Swiper,
        SwiperSlide
    },
    data: () => ({
        ids: [
            'ed77f2028657536dee0e4c8403a59409',
            '995e1ea4887a297ed4af95417288f0db',
            '94a662860bfacfe11a28fa444063d464',
            'b8224064c0c7dd7b69619663bd7838e8',
            'fcea9cc6119e42fd4f5935d21eb7b668',
            'b530c2f266094d1186dbaeed77cc2aa3',
            '1a369008609898058cc6e31b98cb1c33',
        ],
        prependIds: [
            'f6bb879a7a09832f00c9b2669cbd6e5f',
            'aed02e9b31a8e31fdbf5e101fd3c1db8',
        ],
        appendIds: [
            '45ef46c5ff2bf5468a1f630c2b5df4ed',
            'e8c65745ae815f2e87a5c9885b69510f',
        ],
        api,
        swiperOption: {
            lazy: true,
            keyboard: {
                enabled: true,
            },
        }
    }),
    methods: {
        prependPhoto() {
            this.ids.unshift(this.prependIds[0]);
            this.$refs.swiper.$swiper.slideNext(0, false);
        },
        appendPhoto() {
            this.ids.push(this.appendIds[0]);
        },
    },
}
</script>

<style lang="scss" scoped>
.swiper {
    width: 100%;
    height: 500px;
}

.swiper-slide {
    text-align: center;
    background: #444 !important;

    img {
        width: auto;
        height: auto;
        max-width: 100%;
        max-height: 100%;
        transform: translate(-50%, -50%);
        position: absolute;
        left: 50%;
        top: 50%;
    }
}
</style>
