<template>
    <div class="albums"
         :style="{maxHeight: `calc(100vh - ${$vuetify.application.top + $vuetify.application.bottom}px)`}">
        <h3 class="mb-6 text-center">Albums</h3>
        <v-divider class="mb-3"/>

        <div class="cards-grid">
            <v-img height="250" width="250"
                   @click.left="goToAlbum('left', album.id)"
                   @click.middle.prevent="goToAlbum('middle', album.id)"
                   class="image"
                   v-for="album in albums" :key="album.id"
                   aspect-ratio="1"
                   gradient="to top right, rgba(50,62,100,.6), rgba(25,32,72,0)"
                   :src="`${api}/photo/small/${album.MediumId}.webp`"
                   :lazy-src="`${api}/photo/tiny/${album.MediumId}.webp`">
                <div class="item-text">
                    <div>{{ album.name }}</div>
                    <div class="caption">{{ album.count }} item{{ +album.count === 1 ? '' : 's' }}</div>
                </div>
            </v-img>
        </div>
    </div>
</template>

<script lang="ts">
import {api} from "@/ts/constants";
import Vue from "vue";

export default Vue.extend({
    name: "Albums",
    data: () => ({
        api,
    }),
    methods: {
        goToAlbum(button: 'middle' | 'left' | 'right', albumId: string) {
            if (button === 'middle') {
                window.open(`${location.origin}/album/${albumId}`, '_blank');
            } else {
                this.$router.push(`/album/${albumId}`)
            }
        },
    },
    computed: {
        albums() {
            return this.$store.state.albums;
        },
    },
});
</script>

<style scoped>
.albums {
    padding: 30px;
    overflow-y: auto;
    width: 100%;
}

.cards-grid {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-start;
}

.image {
    margin-right: 10px;
    margin-left: 10px;
    margin-bottom: 20px;
    border-radius: 10px;
    cursor: pointer;
}

.item-text {
    position: absolute;
    bottom: 10px;
    width: 100%;
    text-align: center;
    color: white;
    font-weight: bolder;
    font-size: 20px;
    pointer-events: none;
}
</style>
