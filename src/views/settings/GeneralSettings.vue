<template>
    <div class="general-settings">
        <span class="caption"><span class="grey--text">Connected to </span>{{ api }}</span>
        <v-btn class="ml-2" x-small plain @click="$store.dispatch('logout')">Log out</v-btn>
    </div>
</template>

<script lang="ts">
import Vue from "vue";
import {api} from "@/ts/constants";

export default Vue.extend({
    name: "GeneralSettings",
    data: () => ({
        api: api,
    }),
    computed: {}
});
</script>

<style scoped>
</style>
