<template>
    <div class="album"
         v-if="album"
         :style="{
             maxHeight: `calc(100vh - ${$vuetify.application.top + $vuetify.application.bottom}px)`,
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
        <h1 class="mt-6 mb-6 text-center display-3 pointer" @click="editTitle = true" v-else>{{ album.name }}</h1>
        <v-divider/>
        <div class="album-actions">
            <v-icon class="mr-2">mdi-sort</v-icon>
            <span class="caption">{{ sortOptions.find(o => o.name === sort).summary }}</span>
            <v-spacer/>
            <v-btn text title="Delete album" @click="deleteAlbum">
                <v-icon class="mr-2">mdi-delete-outline</v-icon>
                Delete
            </v-btn>

            <v-menu offset-y>
                <template v-slot:activator="{ on, attrs }">
                    <v-btn text v-bind="attrs" v-on="on">
                        <v-icon class="mr-2">mdi-sort</v-icon>
                        Sort
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
        <v-divider/>
        <photo-grid ref="photoGrid" :size-multiplier="1.5" :photos="photos" :usable-width="usableWidth"/>
    </div>
</template>

<script lang="ts">
import {api, scrollBarWidth} from "@/ts/constants";
import Vue from "vue";
import PhotoGrid from "@/components/PhotoGrid.vue";
import {Media} from "@/ts/Media";

export default Vue.extend({
    name: "Album",
    components: {PhotoGrid},
    data: () => ({
        api,
        album: null as any,
        photos: [] as Media[],
        editTitle: false,
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
    mounted() {
        this.loadAlbum();
    },
    methods: {
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
                this.$store.commit('updateAlbums', true);
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
                this.$store.commit('updateAlbums', true);
                this.editTitle = false;
            } else {
                await this.$store.dispatch('addSnack', {text: "Couldn't change title."});
            }
        },
        async loadAlbum() {
            console.log('laoding album with sort', this.sort);
            this.album = await this.$store.dispatch('apiRequest', {
                url: `photos/getAlbum/${this.id}`,
                body: {
                    sort: this.sort,
                },
            });
            this.editedTitle = this.album.name;
            this.photos = this.album.Media.map(Media.fromObject);
            console.log('this album', this.album);
        },
    },
    computed: {
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
    align-items: center;
}

.pointer {
    cursor: pointer;
}

.edit-form {
    display: flex;
    align-items: center;
}

.title-edit {
    font-size: 20px;
}
</style>