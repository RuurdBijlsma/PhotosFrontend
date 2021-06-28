<template>
    <v-card class="selection-info" v-if="isSelecting">
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
        </v-card-actions>
    </v-card>
</template>

<script lang="ts">
import {Media} from "@/ts/Media";
import Vue from "vue";
import {format} from "date-fns";

export default Vue.extend({
    name: 'SelectionInfo',
    data: () => ({
        loading: {
            delete: false,
            reprocess: false,
            fixDate: false,
        },
    }),
    methods: {
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
    bottom: 10px;
    width: 350px;
    left: calc(50% - 175px);
}
</style>
