<template>
    <div class="settings"
         :style="{
             maxHeight: `calc(100vh - ${$vuetify.application.top + $vuetify.application.bottom}px)`,
         }">
        <h3 class="mb-6 text-center">Settings</h3>
        <v-divider/>
        <div class="links">
            <v-btn plain exact to="/settings">Backup & restore</v-btn>
            <v-btn plain to="/settings/map">Map</v-btn>
            <v-btn plain to="/settings/import">Import</v-btn>
        </div>
        <v-divider/>
        <div class="padded">
            <router-view/>
        </div>
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
    overflow-y: auto;
}

.links {
    display: flex;
    justify-content: space-around;
}

.padded {
    padding: 20px;
}
</style>
