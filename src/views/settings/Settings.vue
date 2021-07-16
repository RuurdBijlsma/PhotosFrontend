<template>
    <div class="settings">
        <h2 class="mb-6">Settings</h2>
        <router-view/>
    </div>
</template>

<script lang="ts">
import Vue from "vue";

export default Vue.extend({
    name: "Settings",
});
</script>

<style scoped>
.settings {
    padding: 30px;
    max-width: 1000px;
    margin: 0 auto;
}
</style>
