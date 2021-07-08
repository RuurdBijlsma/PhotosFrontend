<template>
    <div class="upload-result"
         :style="{
            maxHeight: `calc(100vh - ${$vuetify.application.top + $vuetify.application.bottom}px)`,
         }">
        <v-card :width="350" v-for="{file, result} in uploadResults" class="mb-8 card" :key="file">
            <v-img v-if="result.id" :src="`${api}/photo/big/${result.id}.webp`"/>
            <v-card-title>{{ file }}</v-card-title>
            <v-card-subtitle v-if="!result.success">
                Can't upload: {{ result.error }}
            </v-card-subtitle>
            <v-card-text v-if="result.success">Uploaded successfully</v-card-text>
            <v-card-actions v-if="result.id">
                <v-spacer/>
                <v-btn text color="primary" :to="`/photo/${result.id}`">View image</v-btn>
            </v-card-actions>
            <v-progress-linear absolute :value="100" :color="result.success ? 'success' : 'warning'"/>
        </v-card>
    </div>
</template>

<script lang="ts">
import Vue from 'vue'
import GridPhoto from "@/components/GridPhoto.vue";
import {api} from "@/ts/constants";

export default Vue.extend({
    name: 'UploadResult',
    components: {GridPhoto},
    data: () => ({
        api,
    }),
    async mounted() {
        if (this.uploadResults.length === 0)
            await this.$router.push('/');
    },
    methods: {},
    computed: {
        uploadResults() {
            return this.$store.state.uploadResults;
        },
    },
    watch: {}
})
</script>

<style scoped>
.upload-result {
    overflow-y: auto;
    padding: 30px;
    display: flex;
    flex-direction: column;
}

.card {
    display: inline-block;
}

</style>
