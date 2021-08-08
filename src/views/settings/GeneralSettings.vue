<template>
    <div class="general-settings">
        <span class="caption"><span class="grey--text">Connected to </span>{{ api }}</span>
        <v-btn class="ml-2" x-small plain @click="$store.dispatch('logout')">Log out</v-btn>
add back        <br>
        <v-btn class="mt-2" outlined @click="backupDb">Backup database</v-btn>
        <div class="restore">

            <v-dialog v-model="dialog" max-width="700">
                <template v-slot:activator="{ on, attrs }">
                    <v-btn class="mt-2" outlined v-bind="attrs" v-on="on">Restore database</v-btn>
                </template>
                <v-card>
                    <v-card-title>
                        Restore files
                    </v-card-title>
                    <v-card-text>

                        <v-radio-group v-model="selectedRestoreOption">
                            <v-radio
                                v-for="option in restoreOptions"
                                :key="option"
                                :label="option"
                                :value="option"
                            ></v-radio>
                        </v-radio-group>
                    </v-card-text>
                    <v-divider/>
                    <v-card-actions>
                        <v-spacer></v-spacer>
                        <v-btn color="primary" text @click="restoreChoice" :disabled="selectedRestoreOption === null">
                            Restore database
                        </v-btn>
                    </v-card-actions>
                </v-card>
            </v-dialog>
<!--            <v-file-input dense hide-details class="mt-2"-->
<!--                          accept=".dump,*"-->
<!--                          outlined @change="restoreFromFile"-->
<!--                          label="Restore database from file"/>-->
        </div>
    </div>
</template>

<script lang="ts">
import Vue from "vue";
import {api} from "@/ts/constants";

export default Vue.extend({
    name: "GeneralSettings",
    data: () => ({
        api: api,
        dialog: false,
        restoreOptions: [],
        selectedRestoreOption: null,
    }),
    methods: {
        async restoreChoice() {
            this.$router.push('/logs').then();
            await this.$store.dispatch('apiRequest', {
                url: 'photos/restoreDb',
                body: {file: this.selectedRestoreOption},
            });
        },
        async loadRestoreOptions() {
            this.restoreOptions = await this.$store.dispatch('apiRequest', {url: 'photos/getRestoreOptions'});
        },
        restoreFromFile(file: File) {
            console.log('restore from file', file);
        },
        async backupDb() {
            this.$router.push('/logs').then();
            await this.$store.dispatch('apiRequest', {url: 'photos/backupDb'});
        },
    },
    computed: {},
    watch: {
        dialog() {
            this.loadRestoreOptions();
        },
    },
});
</script>

<style scoped>
.restore {
    display: flex;
    align-items: center;
}
</style>
