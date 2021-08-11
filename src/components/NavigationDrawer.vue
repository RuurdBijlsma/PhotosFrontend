<template>
    <v-navigation-drawer :expand-on-hover="$vuetify.breakpoint.width < 1600"
                         :width="205"
                         @mouseenter.native="hover = true"
                         @mouseleave.native="hover = false"
                         permanent app
                         v-if="!$vuetify.breakpoint.mobile"
                         clipped
                         hide-overlay>
        <v-list dense nav>
            <v-list-item v-for="page in pages" exact
                         :to="page.to" :key="page.to"
                         @mousedown="$emit('scroll-to-top')">
                <v-list-item-icon>
                    <v-icon>{{ page.icon }}</v-icon>
                </v-list-item-icon>
                <v-list-item-content>
                    <v-list-item-title>{{ page.name }}</v-list-item-title>
                </v-list-item-content>
            </v-list-item>
            <v-subheader v-if="isExpanded">Library</v-subheader>
            <v-divider v-else class="mt-6 mb-5"></v-divider>
            <template v-if="albums.length > 0">
                <v-list-group
                    color="default"
                    :value="true">
                    <template v-slot:activator>
                        <v-list-item-icon>
                            <v-icon>mdi-file-image-outline</v-icon>
                        </v-list-item-icon>
                        <v-list-item-content>
                            <v-list-item-title>
                                <div @click="goToAlbums">Albums</div>
                            </v-list-item-title>
                        </v-list-item-content>
                    </template>

                    <v-list-item dense v-for="album in albums"
                                 :key="album.id"
                                 :to="`/album/${album.id}`">
                        <v-list-item-avatar class="avatar" :size="isExpanded ? 32 : 24" rounded>
                            <v-img v-if="album.MediumId !== null" :src="`${api}/photo/tiny/${album.MediumId}.webp`"/>
                            <v-icon v-else>mdi-alpha-{{ album.name.substr(0,1).toLowerCase() }}-box-outline</v-icon>
                        </v-list-item-avatar>
                        <v-list-item-content>
                            <v-list-item-title :title="album.name"> {{ album.name }}</v-list-item-title>
                        </v-list-item-content>
                    </v-list-item>
                </v-list-group>
            </template>

        </v-list>
    </v-navigation-drawer>
</template>

<script lang="ts">
import Vue from "vue";
import {api} from "@/ts/constants";

export default Vue.extend({
    name: "NavigationDrawer",
    props: {},
    data: () => ({
        hover: false,
        api,
        albums: [],
        pages: [
            {name: 'Photos', icon: 'mdi-image-outline', to: '/'},
            {name: 'Explore', icon: 'mdi-magnify', to: '/explore'},
            {name: 'Photo map', icon: 'mdi-map-outline', to: '/map'},
        ],
    }),
    async mounted() {
        await this.loadAlbums();
        console.log(this.albums);
    },
    methods: {
        goToAlbums(e: MouseEvent) {
            e.stopPropagation();
            this.$router.push('/albums');
            console.log(e);
        },
        async loadAlbums() {
            this.albums = await this.$store.dispatch('apiRequest', {url: 'photos/getAlbums'});
        },
    },
    computed: {
        isExpanded() {
            return this.$vuetify.breakpoint.width >= 1600 || this.hover;
        },
    },
    watch: {
        '$store.state.updateAlbums'() {
            if (this.$store.state.updateAlbums) {
                this.$store.commit('updateAlbums', false);
                this.loadAlbums();
            }
        },
    },
});
</script>

<style scoped>
.avatar {
    transition: 0.2s;
}
</style>
