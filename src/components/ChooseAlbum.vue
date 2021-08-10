<template>
    <v-dialog v-model="prompt.show" max-width="500">
        <v-card>
            <v-card-title>Choose album</v-card-title>
            <v-card-text>
                <v-form class="create" @submit.prevent="createNew()">
                    <v-text-field outlined dense label="Create album" v-model="newName"/>
                    <v-btn type="submit" class="ml-2" icon title="Create new album">
                        <v-icon>mdi-plus</v-icon>
                    </v-btn>
                </v-form>
                <v-radio-group v-model="selectedAlbum" v-if="albums.length > 0">
                    <v-radio v-for="album in albums" :key="album.id" :value="album" :label="album.name"/>
                </v-radio-group>
                <p v-else>No existing albums found</p>
            </v-card-text>
            <v-divider></v-divider>
            <v-card-actions>
                <v-spacer/>
                <v-btn text @click="dialogCancel">
                    Cancel
                </v-btn>
                <v-btn color="primary" text @click="dialogConfirm"
                       :disabled="selectedAlbum === null || albums.length === 0">
                    Select
                </v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>
</template>

<script>

export default {
    name: "AlbumDialog",
    data: () => ({
        albums: [],
        selectedAlbum: null,
        newName: '',
    }),
    mounted() {
        this.loadAlbums();
    },
    methods: {
        async loadAlbums() {
            this.albums = await this.$store.dispatch('apiRequest', {url: 'photos/getAlbums'});
        },
        createNew() {
            this.$store.commit('showChooseAlbum', false);
            this.prompt.onConfirm({canceled: false, create: true, name: this.newName});
        },
        dialogCancel() {
            this.$store.commit('showChooseAlbum', false);
            this.prompt.onCancel();
        },
        dialogConfirm() {
            this.$store.commit('showChooseAlbum', false);
            this.prompt.onConfirm({canceled: false, create: false, album: this.selectedAlbum});
        },
    },
    watch: {
        async 'prompt.show'() {
            if (!this.prompt.show)
                this.prompt.onCancel();
            else
                this.loadAlbums();
            console.log('this.albums', this.albums);
        },
    },
    computed: {
        prompt() {
            return this.$store.state.albumPrompt;
        },
    },
}
</script>

<style scoped>
.create {
    display: flex;
}
</style>
