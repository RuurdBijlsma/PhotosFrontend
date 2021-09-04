<template>
    <div class="album"
         v-if="album"
         :style="{
             maxHeight: `calc(100vh - ${$vuetify.application.top + $vuetify.application.bottom + $store.getters.selectionHeight}px)`,
             padding: pagePadding + 'px',
         }">
        <router-view/>
        <v-form class="edit-form" v-if="editTitle" @submit.prevent="submitTitle">
            <v-text-field
                class="title-edit"
                v-model="editedTitle"
                ref="titleEdit"/>
            <v-btn class="ml-2" @click="editTitle=false" text>
                Cancel
            </v-btn>
            <v-btn class="ml-2" type="submit" text color="primary">
                <v-icon class="mr-2">mdi-pencil-outline</v-icon>
                Submit
            </v-btn>
        </v-form>
        <h1 class="mt-6 mb-6 text-center display-3 pointer" @click="editTitle = $store.getters.isLoggedIn" v-else>
            {{ album.name }}</h1>
        <v-divider class="mb-1"/>
        <div class="album-actions" :style="{
            flexDirection:  smallWidth? 'column' : 'row',
            padding: smallWidth ? '10px' : '0',
        }">
            <div>
                <v-icon class="mr-2 ml-2">mdi-sort</v-icon>
                <span class="caption">{{ sortOptions.find(o => o.name === sort).summary }}</span>
                <span class="ml-2 mr-2">•</span>
                <span class="caption">{{ photos.length }} items</span>
            </div>
            <v-divider class="mt-3 mb-3" v-if="smallWidth"/>
            <div>
                <v-btn text :icon="tinyWidth" :small="!tinyWidth" title="Share album"
                       @click="shareAlbum">
                    <v-icon :class="tinyWidth ? '' : 'mr-2'">mdi-share-variant-outline</v-icon>
                    <span v-if="!tinyWidth">Share</span>
                </v-btn>

                <v-btn :loading="downloadLoading" :icon="tinyWidth" :small="!tinyWidth"
                       text title="Download album" @click="downloadAlbum">
                    <v-icon :class="tinyWidth ? '' : 'mr-2'">mdi-download-outline</v-icon>
                    <span v-if="!tinyWidth">Download</span>
                </v-btn>

                <v-btn v-if="$store.getters.isLoggedIn" :icon="tinyWidth"
                       :small="!tinyWidth" text title="Delete album" @click="deleteAlbum">
                    <v-icon :class="tinyWidth ? '' : 'mr-2'">mdi-delete-outline</v-icon>
                    <span v-if="!tinyWidth">Delete</span>
                </v-btn>

                <v-menu offset-y>
                    <template v-slot:activator="{ on, attrs }">
                        <v-btn :icon="tinyWidth" :small="!tinyWidth" text
                               v-bind="attrs" v-on="on">
                            <v-icon :class="tinyWidth ? '' : 'mr-2'">mdi-sort</v-icon>
                            <span v-if="!tinyWidth">Sort</span>
                        </v-btn>
                    </template>
                    <v-list dense>
                        <v-list-item-group v-model="sort">
                            <v-list-item v-for="option in sortOptions" :key="option.name" :value="option.name">
                                <v-list-item-icon>
                                    <v-icon>
                                        {{ option.icon }}
                                    </v-icon>
                                </v-list-item-icon>
                                <v-list-item-content>
                                    <v-list-item-title>{{ option.summary }}</v-list-item-title>
                                </v-list-item-content>
                            </v-list-item>
                        </v-list-item-group>
                    </v-list>
                </v-menu>
            </div>
        </div>
        <v-divider class="mt-1"/>
        <div v-if="photos.length === 0">
            <h3 class="mt-8 text-center text-h6">No items in this album, add some on the
                <router-link to="/">homepage</router-link>
                by selecting and adding them.
            </h3>
        </div>
        <photo-grid ref="photoGrid" :size-multiplier="1.5" :photos="photos" :usable-width="usableWidth"/>
    </div>
</template>

<script lang="ts">
import {api, defaultApi, scrollBarWidth} from "@/ts/constants";
import Vue from "vue";
import PhotoGrid from "@/components/PhotoGrid.vue";
import {Media} from "@/ts/Media";
import {downloadFromUrl, isTouchDevice} from "@/ts/utils";

export default Vue.extend({
    name: "Album",
    components: {PhotoGrid},
    data: () => ({
        api,
        album: null as any,
        photos: [] as Media[],
        editTitle: false,
        downloadLoading: false,
        editedTitle: '',
        sort: 'createDate asc',
        sortOptions: [
            {
                icon: 'mdi-sort-ascending',
                summary: 'Date taken (oldest first)',
                name: 'createDate asc'
            },
            {
                icon: 'mdi-sort-descending',
                summary: 'Date taken (newest first)',
                name: 'createDate desc'
            },
            {
                icon: 'mdi-sort-ascending',
                summary: 'Added to album (oldest first)',
                name: 'added asc'
            },
            {
                icon: 'mdi-sort-descending',
                summary: 'Added to album (newest first)',
                name: 'added desc'
            },
        ],
    }),
    beforeDestroy() {
        this.$store.commit('viewedAlbum', null);
    },
    async mounted() {
        await this.loadAlbum();
        this.$store.commit('viewedAlbum', this.album);
        this.setTitle();
    },
    methods: {
        async shareAlbum() {
            const url = location.href + ((defaultApi === api) ? '' : ('?api=' + api));
            if (isTouchDevice()) {
                await navigator.share({
                    title: `Check out my photo album "${this.album.name}"`,
                    url,
                });
            } else {
                await navigator.clipboard.writeText(url);
                await this.$store.dispatch('addSnack', {text: 'Share URL copied to clipboard!'});
            }
        },
        async downloadAlbum() {
            this.downloadLoading = true;
            let unauthorizedRequest = !this.$store.getters.isLoggedIn && this.$route.params.albumId;
            let body = unauthorizedRequest ? {
                albumId: this.$route.params.albumId
            } : {};
            try {
                let {zipId} = await this.$store.dispatch('apiRequest', {
                    url: `photos/batchDownload`,
                    body: {
                        ids: this.photos.map(p => p.id),
                        ...body,
                    },
                    unauthorizedRequest,
                });
                console.log('zip id', zipId);
                let filename = this.album.name ?? 'album';
                await downloadFromUrl(`${api}/photo/zip/${zipId}.zip`, `${filename}.zip`);
            } catch (e) {
                await this.$store.dispatch('addSnack', {text: `Couldn't download files, ${e.message}`});
                console.warn('cant download', e);
            }
            this.downloadLoading = false;
        },
        async deleteAlbum() {
            let accepted = await this.$store.dispatch('showPrompt', {
                title: `Delete this album?`,
                subtitle: `This cannot be undone.`,
                confirmText: 'Delete',
            });
            if (!accepted) return;
            let success = await this.$store.dispatch('apiRequest', {
                url: 'photos/deleteAlbum', body: {
                    id: this.id,
                },
            });
            if (success) {
                this.$store.dispatch('updateAlbums').then();
                await this.$router.push('/albums');
            } else {
                await this.$store.dispatch('addSnack', {text: "Couldn't change title."});
            }
        },
        async submitTitle() {
            console.log("rename to", this.editedTitle);
            let success = await this.$store.dispatch('apiRequest', {
                url: 'photos/renameAlbum', body: {
                    id: this.id,
                    name: this.editedTitle,
                },
            });
            if (success) {
                this.album.name = this.editedTitle;
                this.$store.dispatch('updateAlbums').then();
                this.editTitle = false;
            } else {
                await this.$store.dispatch('addSnack', {text: "Couldn't change title."});
            }
        },
        async loadAlbum() {
            console.log('loading album with sort', this.sort);
            this.album = await fetch(`${api}/photos/album/${this.id}?sort=${this.sort}`).then(r => r.json());
            this.editedTitle = this.album.name;
            this.photos = this.album.Media.map(Media.fromObject);
            console.log('this album', this.album);
        },
        setTitle(){
            console.log(this.$route.name);
            if (this.$route.name && !this.$route.name.includes('Edit'))
                document.title = `${this.album.name} - Ruurd Photos`;
        },
    },
    computed: {
        tinyWidth() {
            return this.$vuetify.breakpoint.width <= 530;
        },
        smallWidth() {
            return this.$vuetify.breakpoint.width <= 719;
        },
        id() {
            return this.$route.params.albumId;
        },
        pagePadding(): number {
            return this.$vuetify.breakpoint.mobile ? 0 : 30;
        },
        usableWidth(): number {
            return this.$vuetify.breakpoint.width -
                this.$vuetify.application.left - this.$vuetify.application.right -
                this.pagePadding * 2 - scrollBarWidth;
        },
    },
    watch: {
        '$route.name'() {
            this.setTitle();
        },
        '$store.state.reloadPhotos'() {
            if (this.$store.state.reloadPhotos) {
                this.$store.commit('reloadPhotos', false);
                this.loadAlbum();
            }
        },
        '$store.state.updateAlbum'() {
            if (this.$store.state.updateAlbum) {
                this.$store.commit('updateAlbum', false);
                this.loadAlbum();
            }
        },
        '$store.state.keepInView'() {
            if (this.$store.state.keepInView !== null) {
                let photoGrid: any = this.$refs.photoGrid;
                photoGrid.scrollMediaIntoView(this.$store.state.keepInView);
            }
        },
        photos() {
            this.$store.commit('viewerQueue', this.photos);
        },
        sort() {
            this.loadAlbum();
        },
        id() {
            this.loadAlbum();
        },
        async editTitle() {
            if (this.editTitle) {
                await this.$nextTick();
                let el = this.$refs.titleEdit as HTMLElement;
                el.focus();
            }
        },
    },
});
</script>

<style scoped>
.album {
    overflow-y: auto;
    width: 100%;
    padding-top: 0 !important;
}

.album-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.pointer {
    cursor: pointer;
    overflow-wrap: break-word;
    hyphens: auto;
}

.edit-form {
    display: flex;
    align-items: center;
}

.title-edit {
    font-size: 20px;
}
</style>
