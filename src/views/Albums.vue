<template>
    <div>
        albums
    </div>
</template>

<script lang="ts">
import {api} from "@/ts/constants";
import Vue from "vue";

export default Vue.extend({
    name: "Albums",
    data: () => ({
        api,
    }),
    methods: {
    },
    computed: {
    }
});
</script>

<style scoped>
</style>
