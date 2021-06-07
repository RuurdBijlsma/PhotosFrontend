<template>
    <div>
        <a href="https://account.mapbox.com/access-tokens/" target="_blank" referrerpolicy="no-referrer">Get token</a>
        <v-text-field label="Mapbox Key" v-model="mapboxKey"></v-text-field>
    </div>
</template>

<script lang="ts">
import Vue from "vue";

export default Vue.extend({
    name: "Settings",
    computed: {
        mapboxKey: {
            get(): string {
                return this.$store.state.mapboxKey;
            },
            set(v: string) {
                this.$store.commit('mapboxKey', v);
            },
        }
    }
});
</script>

<style scoped>

</style>
