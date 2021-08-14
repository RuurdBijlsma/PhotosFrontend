<template>
    <v-card class="selection-info" v-if="isSelecting" :style="{
        bottom: $vuetify.application.bottom + 10 + 'px',
    }">
        <v-card-title>Selected {{ selectionCount }} item{{ selectionCount === 1 ? '' : 's' }}</v-card-title>
        <v-card-subtitle v-if="firstDate !== lastDate">From
            <span class="font-weight-bold">{{ firstDate }}</span>
            to
            <span class="font-weight-bold">{{ lastDate }}</span>
        </v-card-subtitle>
        <v-card-subtitle v-else class="font-weight-bold">{{ firstDate }}</v-card-subtitle>
        <v-card-actions>
            <v-btn text plain small @click="clearSelection">Clear selection</v-btn>
            <v-spacer/>
            <v-btn plain small @click="deleteItems" icon title="Delete" :loading="loading.delete">
                <v-icon>mdi-delete-outline</v-icon>
            </v-btn>
            <v-btn plain small @click="reprocess" icon title="Reprocess" :loading="loading.reprocess">
                <v-icon>mdi-auto-fix</v-icon>
            </v-btn>
            <v-btn plain small @click="fixDate" icon title="Fix date from filename" :loading="loading.fixDate">
                <v-icon>mdi-calendar-range</v-icon>
            </v-btn>
            <v-btn plain small @click="downloadItems" icon title="Download" :loading="loading.download">
                <v-icon>mdi-download-outline</v-icon>
            </v-btn>
            <v-btn plain small @click="addToAlbum" icon title="Add to album" :loading="loading.album">
                <v-icon>mdi-plus-circle-outline</v-icon>
            </v-btn>
            <v-btn v-if="$store.state.viewedAlbum !== null"
                   plain small @click="removeFromAlbum"
                   icon title="Remove from album" :loading="loading.removeAlbum">
                <v-icon>mdi-minus-circle-outline</v-icon>
            </v-btn>
        </v-card-actions>
    </v-card>
</template>

<script lang="ts">
import {Media} from "@/ts/Media";
import Vue from "vue";
import {format} from "date-fns";
import {downloadFromUrl} from "@/ts/utils";
import {api} from "@/ts/constants";

export default Vue.extend({
    name: 'SelectionInfo',
    data: () => ({
        loading: {
            delete: false,
            reprocess: false,
            fixDate: false,
            download: false,
            album: false,
            removeAlbum: false,
        },
    }),
    methods: {
        async removeFromAlbum() {
            this.loading.removeAlbum = true;
            let accepted = await this.$store.dispatch('showPrompt', {
                title: `Are you sure?`,
                subtitle: `Removing ${
                    this.selectionCount
                } items from album "${
                    this.$store.state.viewedAlbum.name
                }"?`,
                confirmText: 'Remove',
            });
            if (accepted) {
                try {
                    let success = await this.$store.dispatch('apiRequest', {
                        url: 'photos/removeFromAlbum',
                        body: {
                            id: this.$store.state.viewedAlbum.id,
                            ids: this.selectedMedias.map(p => p.id),
                        },
                    });
                    console.log('success', success);
                    if (!success) {
                        await this.$store.dispatch('addSnack', {text: "Couldn't remove items"});
                    } else {
                        this.clearSelection();
                        this.$store.commit('updateAlbum', true);
                        this.$store.dispatch('updateAlbums').then();
                    }
                } catch (e) {
                    console.warn(e);
                    await this.$store.dispatch('addSnack', {text: "Couldn't remove items. " + e.message});
                }
            }
            this.loading.removeAlbum = false;
        },
        async addToAlbum() {
            this.loading.album = true;
            let album: { canceled: boolean, album: any, create: boolean, name: string } = await new Promise(resolve => {
                this.$store.commit('albumPrompt', {
                    show: true,
                    onConfirm: resolve,
                    onCancel: () => resolve({canceled: true, album: null, create: false, name: ''}),
                });
            });
            if (album.canceled) {
                this.loading.album = false;
                return;
            }
            if (album.create) {
                try {
                    let result = await this.$store.dispatch('apiRequest', {
                        url: `photos/createAlbum`,
                        body: {
                            name: album.name,
                            ids: this.selectedMedias.map(p => p.id)
                        },
                    });
                    console.log('create', result);
                    if (result.id) {
                        this.clearSelection();
                        this.$store.dispatch('updateAlbums').then();
                        await this.$router.push(`/album/${result.id}`);
                    } else {
                        // noinspection ExceptionCaughtLocallyJS
                        throw new Error(result);
                    }
                } catch (e) {
                    await this.$store.dispatch('addSnack', {text: "Can't add to album! " + e.message});
                    console.warn("Can't add to album", e);
                }
            } else {
                console.log(album);
                try {
                    let result = await this.$store.dispatch('apiRequest', {
                        url: `photos/addToAlbum`,
                        body: {
                            id: album.album.id,
                            ids: this.selectedMedias.map(p => p.id)
                        },
                    });
                    console.log('add', result);
                    if (result) {
                        this.clearSelection();
                        await this.$router.push(`/album/${album.album.id}`);
                    } else {
                        // noinspection ExceptionCaughtLocallyJS
                        throw new Error(result);
                    }
                } catch (e) {
                    await this.$store.dispatch('addSnack', {text: "Can't add to album! " + e.message});
                    console.warn("Can't add to album", e);
                }
            }
            this.loading.album = false;
        },
        async downloadItems() {
            this.loading.download = true;
            let unauthorizedRequest = !this.$store.getters.isLoggedIn && this.$route.params.albumId;
            let body = unauthorizedRequest ? {
                albumId: this.$route.params.albumId
            } : {};

            console.log('body',body);
            if (this.selectedMedias.length < 5) {
                let fullMedias = await Promise.all(this.selectedMedias.map(
                    m => this.$store.dispatch('apiRequest', {
                        url: `photos/${m.id}`,
                        body,
                        unauthorizedRequest,
                    })
                ));
                console.log('fullmedias', fullMedias)
                let promises = [];
                for (let media of fullMedias) {
                    console.log(media);
                    promises.push(downloadFromUrl(`${api}/photos/full/${media.id}`, media.filename));
                }
                await Promise.all(promises);
            } else {
                try {
                    let {zipId} = await this.$store.dispatch('apiRequest', {
                        url: `photos/batchDownload`,
                        body: {
                            ids: this.selectedMedias.map(p => p.id),
                            ...body,
                        },
                        unauthorizedRequest,
                    });
                    console.log('zip id', zipId);
                    let start = this.selectedMedias[0].createDate;
                    let end = this.selectedMedias[this.selectedMedias.length - 1].createDate;
                    [start, end] = [start, end].sort((a, b) => a.getTime() - b.getTime());
                    let startString = format(start, 'yyyy-MM-dd');
                    let endString = format(end, 'yyyy-MM-dd');
                    const filename = startString !== endString ? `photos_${startString}_${endString}` : startString;
                    await downloadFromUrl(`${api}/photo/zip/${zipId}.zip`, `${filename}.zip`);
                } catch (e) {
                    await this.$store.dispatch('addSnack', {text: `Couldn't download files, ${e.message}`});
                    console.warn('cant download', e);
                }
            }
            this.clearSelection();
            this.loading.download = false;
        },
        async batchAction({
                              name = 'delete',
                              subTitleInfix = 'delete',
                              endpoint = 'batchDelete',
                              someFailText = 'Some items failed to delete',
                              failText = 'Deleting items failed',
                              successText = 'Successfully deleted items!',
                              confirmText = 'Delete',
                              reloadItems = false,
                              clearSelection = false,
                          }) {
            //@ts-ignore
            this.loading[name] = true;
            let allFailed = true;
            let allSuccess = false;
            let result = null;

            await (async () => {
                let accepted = await this.$store.dispatch('showPrompt', {
                    title: `Are you sure?`,
                    subtitle: `This will ${subTitleInfix} ${this.selectedMedias.length} item${this.selectedMedias.length === 1 ? '' : 's'}!`,
                    confirmText: confirmText,
                });
                if (!accepted) return;
                result = await this.$store.dispatch('apiRequest', {
                    url: `photos/${endpoint}`,
                    body: {ids: this.selectedMedias.map(p => p.id)},
                });
                if (Array.isArray(result.results)) {
                    allFailed = result.results.every((r: any) => r.success === false);
                    allSuccess = result.results.every((r: any) => r.success === true);
                }
                console.log('result', {allFailed, allSuccess}, result);
                if (allFailed)
                    return this.$store.dispatch('addSnack', {text: failText}).then();
                else if (allSuccess)
                    return this.$store.dispatch('addSnack', {text: successText}).then();
                else
                    return this.$store.dispatch('addSnack', {text: someFailText}).then();
            })();

            if (reloadItems && !allFailed) {
                this.$store.commit('reloadPhotos', true);
            }
            if (clearSelection && !allFailed) {
                this.clearSelection();
            }
            //@ts-ignore
            this.loading[name] = false;
            return result;
        },
        async deleteItems() {
            await this.batchAction({
                name: 'delete',
                subTitleInfix: 'delete',
                endpoint: 'batchDelete',
                someFailText: 'Some items failed to delete',
                failText: 'Deleting items failed',
                successText: 'Successfully deleted items!',
                confirmText: 'Delete',
                reloadItems: true,
                clearSelection: true,
            });
        },
        async reprocess() {
            await this.batchAction({
                name: 'reprocess',
                subTitleInfix: 'reprocess',
                endpoint: 'batchReprocess',
                someFailText: 'Some items failed to reprocess',
                failText: 'Reprocessing items failed',
                successText: 'Successfully reprocessed items!',
                confirmText: 'Reprocess',
                reloadItems: true,
                clearSelection: true,
            });
        },
        async fixDate() {
            await this.batchAction({
                name: 'fixDate',
                subTitleInfix: 'attempt to fix the date of',
                endpoint: 'batchFixDate',
                someFailText: 'Fixed some of the dates',
                failText: 'Fixing dates of items failed',
                successText: 'Successfully fixed dates of items!',
                confirmText: 'Fix dates',
                reloadItems: true,
                clearSelection: true,
            });
        },
        clearSelection() {
            this.$store.commit('lastSelectedPhoto', null);
            this.$store.commit('clearPhotoSelection');
            this.$store.commit('delayedIsSelecting', false);
        },
    },
    computed: {
        firstDate(): string {
            return format(this.selectedMedias[0].createDate, 'yyyy-MM-dd');
        },
        lastDate(): string {
            return format(this.selectedMedias[this.selectedMedias.length - 1].createDate, 'yyyy-MM-dd');
        },
        selectedMedias(): Media[] {
            let medias: Media[] = Object.values(this.$store.state.photoSelection);
            return medias.sort((a: Media, b: Media) => a.createDate.getTime() - b.createDate.getTime());
        },
        isSelecting(): boolean {
            return this.$store.getters.isSelecting;
        },
        selectionCount(): number {
            return Object.keys(this.$store.state.photoSelection).length
        },
    },
})
</script>

<style scoped>
.selection-info {
    position: fixed;
    width: 400px;
    left: calc(50% - 175px);
}
</style>
