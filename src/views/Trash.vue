<template>
    <div class="trash"
         :style="{
            maxHeight: `calc(100vh - ${$vuetify.application.top + $vuetify.application.bottom}px)`,
         }">
        <div class="container">
            <div class="trash-items" v-if="trashItems.length > 0">
                <h2 class="mb-4">Trash</h2>
                <div class="items">
                    <v-card :max-width="350" v-for="item in trashItems" :key="item.filePath">
                        <v-img :max-height="200" :src="`${api}/photos/blocked/${item.id}`"></v-img>
                        <v-card-title>{{ item.filePath }}</v-card-title>
                        <v-card-subtitle>
                            Deleted at {{ formatDate(item.createdAt) }}
                        </v-card-subtitle>
                        <v-card-actions>
                            <v-spacer/>
                            <v-btn :loading="item.loading" icon color="primary" @click="downloadItem(item)">
                                <v-icon>mdi-download</v-icon>
                            </v-btn>
                        </v-card-actions>
                    </v-card>
                </div>
            </div>
            <h2 v-else>No items in trash</h2>
            <div class="failed-items mt-10" v-if="errorItems.length > 0">
                <h2 class="mb-4">Failed to process</h2>
                <div class="items">
                    <v-card :max-width="350" v-for="item in errorItems" :key="item.filePath">
                        <v-img :max-height="200" :src="`${api}/photos/blocked/${item.id}`"></v-img>
                        <v-card-title>{{ item.filePath }}</v-card-title>
                        <v-card-subtitle>
                            Failed at {{ formatDate(item.createdAt) }}
                            <v-divider class="mt-2 mb-2"/>
                            <p class="error-line" v-for="line of errorLines(item)">{{ line }}</p>
                        </v-card-subtitle>
                        <v-card-actions>
                            <v-spacer/>
                            <v-btn :loading="item.loading" icon color="primary" @click="downloadItem(item)">
                                <v-icon>mdi-download</v-icon>
                            </v-btn>
                            <v-btn :loading="item.retrying" text color="primary" @click="retry(item)">Retry</v-btn>
                        </v-card-actions>
                    </v-card>
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts">
import {format} from "date-fns";
import Vue from "vue";
import {api} from "@/ts/constants";

export default Vue.extend({
    name: "Trash",
    data: () => ({
        trashItems: [] as any[],
        errorItems: [] as any[],

        api,
    }),
    async mounted() {
        let blocked = await this.$store.dispatch('apiRequest', {url: 'photos/blockedItems'});
        this.trashItems = blocked.filter((b: { reason: string; }) => b.reason === 'deleted');
        this.errorItems = blocked.filter((b: { reason: string; }) => b.reason === 'error');
        console.log(this.trashItems, this.errorItems);
    },
    methods: {
        async retry(item: any) {
            Vue.set(item, 'retrying', true);
            let result = await this.$store.dispatch('apiRequest', {
                url: 'photos/retryProcess',
                body: {filePath: item.filePath}
            });
            if (result.success === false) {
                this.$store.dispatch('addSnack', {text: 'Failed to process item again'});
            } else {
                this.$store.dispatch('addSnack', {
                    text: `Processed item successfully`,
                    toText: 'Visit',
                    to: `/photo/${result.id}`
                });
            }
            Vue.set(item, 'retrying', false);
        },
        async downloadItem(item: any) {
            Vue.set(item, 'downloading', true);
            try {
                let blob = await fetch(`${api}/photos/blocked/${item.id}`).then(resp => resp.blob());
                if (blob.type === 'text/html' && blob.size < 1000) {
                    this.$store.dispatch('addSnack', {text: "Item not found on server!"});
                    throw new Error("Not found");
                }
                console.log(blob);
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                let pathParts = item.filePath.split('/');
                a.download = pathParts[pathParts.length - 1];
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
            } catch (e) {
            } finally {
                Vue.set(item, 'downloading', false);
            }
        },
        errorLines(item: any) {
            return item?.error?.message?.split?.('\n') ?? [];
        },
        formatDate(dateString: string) {
            return format(new Date(dateString), 'H:mm:ss, eeee dd MMMM yyyy')
        },
    },
});
</script>

<style scoped>
.trash {
    padding: 20px;
    overflow-y: auto;
}

.container {
    max-width: 800px;
    margin: 0 auto;
}


.items > * {
    margin: 5px;
}

.error-line {
    font-family: monospace;
    margin-bottom: 0;
}
</style>
