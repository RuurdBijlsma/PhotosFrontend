<template>
    <div class="map">
        <photo-map
            :style="{
                height: mapHeight + 'px',
                width: mapWidth + 'px',
            }"
            :height="mapHeight"
            :width="mapWidth"
        ></photo-map>
    </div>
</template>

<script lang="ts">
import Vue from 'vue'
import PhotoMap from "@/components/PhotoMap.vue";

export default Vue.extend({
    name: 'Map',
    components: {PhotoMap},
    data: () => ({}),
    async mounted() {
    },
    methods: {},
    computed: {
        mapHeight(): number {
            return this.$vuetify.breakpoint.height - this.$vuetify.application.top - this.$vuetify.application.bottom;
        },
        mapWidth(): number {
            return this.$vuetify.breakpoint.width - this.$vuetify.application.left - this.$vuetify.application.right;
        },
    },
    watch: {}
})
</script>

<style scoped>
.map {
    overflow: hidden;
}
</style>
