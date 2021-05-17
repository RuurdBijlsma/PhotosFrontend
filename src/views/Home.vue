<template>
    <div class="home">
        <div class="photo" v-for="photo in photos">
            <img v-if="photo.type === 'image'" :src="`${api}/photo/small/${photo.id}.webp`" alt="photo.filename">
            <video @mouseleave="pauseVideo(photo.id)" @mouseenter="playVideo(photo.id)"
                   :poster="`${api}/photo/small/${photo.id}.webp`"
                   muted
                   :ref="`video${photo.id}`" v-else :src="`${api}/photo/webm/${photo.id}.webm`"></video>
        </div>
    </div>
</template>

<script lang="ts">
import Vue from 'vue'
import {mapState} from "vuex";

export default Vue.extend({
    name: 'Home',
    data: () => ({
        photos: [],
        api: "http://localhost:3000"
    }),
    async mounted() {
        this.photos = await this.$store.dispatch('getPhotos', {limit: 50, offset: 0});
        console.log(this.photos);
    },
    methods: {
        playVideo(id: string) {
            let video: HTMLVideoElement = this.$refs['video' + id]?.[0];
            video?.play?.();
        },
        pauseVideo(id: string) {
            let video: HTMLVideoElement = this.$refs['video' + id]?.[0];
            video?.pause?.();
        },
    },
    computed: {},
})
</script>

<style scoped>
.home {
    padding: 20px;
}

.photo {
    display: inline-block;
    width: 200px;
    margin: 10px;
}

.photo > * {
    width: 100%;
    height: auto;
}
</style>
