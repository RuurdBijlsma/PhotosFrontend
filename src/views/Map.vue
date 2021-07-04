<template>
    <div class="map">
        <v-menu offset-y :close-on-content-click="false" v-model="showPicker">
            <template v-slot:activator="{ on, attrs }">
                <v-text-field
                    class="text-field"
                    solo
                    dense
                    hide-details
                    v-bind="attrs"
                    v-on="on"
                    v-model="dateRangeText"
                    label="Date range"
                    prepend-inner-icon="mdi-calendar"
                    readonly
                ></v-text-field>
            </template>
            <v-sheet class="menu-content">
                <v-date-picker class="date-picker" scrollable show-adjacent-months v-model="dates" range/>
                <v-btn class="mt-2 mb-2" text @click="applySelection">Apply</v-btn>
            </v-sheet>
        </v-menu>
        <photo-map
            ref="photoMap"
            :start-date="startDate"
            :end-date="endDate"
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
import {addDays, format, subYears} from "date-fns";

const d = new Date();
export default Vue.extend({
    name: 'Map',
    components: {PhotoMap},
    data: () => ({
        showPicker: false,
        dates: [format(subYears(d, 10), 'yyyy-MM-dd'), format(d, 'yyyy-MM-dd')],
    }),
    async mounted() {
    },
    methods: {
        applySelection() {
            this.showPicker = false
        },
    },
    computed: {
        startDate() {
            return new Date(this.dates[0]);
        },
        endDate() {
            return addDays(new Date(this.dates[1]), 1);
        },
        dateRangeText() {
            return this.dates.join(' ~ ')
        },
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

.text-field {
    position: absolute;
    z-index: 10;
    width: 300px;
    left: calc(50% - 150px);
    top: 10px;
}

.menu-content {
    display: flex;
    flex-direction: column;
}

.date-picker {
    width: 100%;
}
</style>
