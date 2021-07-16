<template>
    <div class="map-settings">
        <v-form>
            <a href="https://account.mapbox.com/access-tokens/" target="_blank" referrerpolicy="no-referrer">
                Get Mapbox token
            </a>
            <div class="token">
                <v-text-field name="mapboxKey" outlined class="mt-4" label="Mapbox Key" v-model="mapboxKey"/>
                <v-icon v-if="tokenChangeSaved" class="ml-4 mb-4" color="success" title="Token saved">mdi-check</v-icon>
            </div>
        </v-form>
    </div>
</template>

<script lang="ts">
import Vue from "vue";

export default Vue.extend({
    name: "Settings",
    data: () => ({
        updateServerToken: -1,
        tokenChangeSaved: false,
    }),
    computed: {
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
.token {
    display: flex;
}
</style>
