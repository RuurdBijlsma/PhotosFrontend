<template>
    <div class="settings">
        <h2 class="mb-6">Settings</h2>
        <a href="https://account.mapbox.com/access-tokens/" target="_blank" referrerpolicy="no-referrer">
            Get Mapbox token
        </a>
        <v-form>
            <div class="token">
                <v-text-field name="mapboxKey" outlined class="mt-4" label="Mapbox Key" v-model="mapboxKey"/>
                <v-icon v-if="tokenChangeSaved" class="ml-4 mb-4" color="success" title="Token saved">mdi-check</v-icon>
            </div>
            <v-text-field name="apiUrl" outlined class="mt-4" label="API endpoint" v-model="apiUrl"/>
        </v-form>
        <v-btn outlined v-if="reloadNeeded" @click="reload" :loading="rotating">
            <v-icon class="mr-3">mdi-reload</v-icon>
            Apply changes
        </v-btn>
    </div>
</template>

<script lang="ts">
import Vue from "vue";
import {api} from "@/ts/constants";

export default Vue.extend({
    name: "Settings",
    data: () => ({
        apiUrlChanged: false,
        rotating: false,
        updateServerToken: -1,
        tokenChangeSaved: false,
    }),
    methods: {
        reload() {
            this.rotating = true;
            location.reload();
        },
    },
    computed: {
        reloadNeeded() {
            return this.apiUrlChanged;
        },
        apiUrl: {
            get(): string {
                return api;
            },
            set(v: string) {
                localStorage.api = v;
                this.apiUrlChanged = v !== api;
            },
        },
        mapboxKey: {
            get(): string {
                return this.$store.state.mapboxKey;
            },
            set(v: string) {
                this.tokenChangeSaved = false;
                clearTimeout(this.updateServerToken);
                this.updateServerToken = setTimeout(async () => {
                    console.warn("UPDATING SERVER TOKEN");
                    await this.$store.dispatch('apiRequest', {url: 'photos/setMapboxToken', body: {token: v}});
                    this.$store.commit('mapboxKey', v);
                    this.tokenChangeSaved = true;
                }, 500);
            },
        },
    }
});
</script>

<style scoped>
.settings {
    padding: 30px;
    max-width: 1000px;
    margin: 0 auto;
}

.token {
    display: flex;
}
</style>
