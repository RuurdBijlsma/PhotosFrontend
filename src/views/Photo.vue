<template>
    <div class="media-photo" v-if="media !== null">
        <div v-if="media.type === 'photo'"
             :style="{
                        backgroundImage: `url(${api}/photos/big/${media.id}.webp)`
                     }"
             :alt="media.filename"></div>
        <video :poster="`${api}/photos/big/${media.id}.webp`"
               controls
               :ref="`video${media.id}`" v-else
               :src="`${api}/photos/webm/${media.id}.webm`"></video>
    </div>
</template>

<script lang="ts">
import Vue from 'vue'
import {api} from "@/ts/constants"
import {Media} from "@/ts/Media";

export default Vue.extend({
    name: 'Photo',
    props: {},
    data: () => ({
        api,
        media: null as Media | null,
    }),
    beforeDestroy() {
    },
    async mounted() {
        await this.updateFromId();
    },
    methods: {
        async updateFromId() {
            let media = await this.$store.dispatch('apiRequest', {url: `photos/${this.id}`});
            this.media = Media.fromObject(media);
            console.log(this.media);
        },
    },
    computed: {
        id(): string {
            return this.$route.params.id;
        },
    },
    watch: {
        id() {
            this.updateFromId();
        },
    },
})
</script>

<style scoped>
.media-photo {
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    position: fixed;
    background-color: black;
    z-index: 5;
}

.media-photo > * {
    width: 100%;
    height: 100%;
}

.media-photo > div {
    background-position: center;
    background-size: contain;
}
</style>
