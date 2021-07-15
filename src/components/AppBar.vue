<template>
    <v-app-bar elevation="0" app clipped-left>
        <router-link to="/" class="home-link no-style">
            <img class="logo-icon" src="../assets/transparent-color-icon-256.png"
                 alt="icon">
            <v-app-bar-title v-if="$vuetify.breakpoint.width > 500"
                             class="logo-text">Photos
            </v-app-bar-title>
        </router-link>

        <v-spacer></v-spacer>

        <v-autocomplete solo dense
                        hide-details
                        :label='searchTip === "" ? "Search..." : `Search "${searchTip}"`'
                        prepend-inner-icon="mdi-magnify"
                        append-icon=""
                        hide-no-data
                        :loading="loadingSuggestions"
                        :items="items"
                        clearable
                        @keypress.enter="enterPressed"
                        ref="search"
                        return-object
                        :search-input.sync="query"
                        v-model="querySelect"/>

        <v-spacer/>

        <v-btn v-if="!$vuetify.breakpoint.mobile" plain small @click="promptUpload" class="mr-3"
               :loading="uploadLoading">
            <v-icon class="mr-2">mdi-upload-outline</v-icon>
            Upload
        </v-btn>

        <v-menu :close-on-content-click="false" v-model="showMenu">
            <template v-slot:activator="{ on, attrs }">
                <v-btn icon v-bind="attrs" v-on="on">
                    <v-icon>mdi-cog-outline</v-icon>
                </v-btn>
            </template>
            <v-list dense>
                <v-list-item to="/settings">
                    <v-list-item-icon>
                        <v-icon>mdi-cog</v-icon>
                    </v-list-item-icon>
                    <v-list-item-content>
                        <v-list-item-title>Settings</v-list-item-title>
                    </v-list-item-content>
                </v-list-item>
                <v-list-item color="primary">
                    <v-list-item-icon>
                        <v-icon>mdi-brightness-6</v-icon>
                    </v-list-item-icon>
                    <v-list-item-content>
                        <v-list-item-title class="theme-switch">
                            <span>Dark theme</span>
                        </v-list-item-title>
                    </v-list-item-content>
                    <v-list-item-action>
                        <v-switch dense inset v-model="$vuetify.theme.dark"></v-switch>
                    </v-list-item-action>
                </v-list-item>
                <v-list-item to="/trash">
                    <v-list-item-icon>
                        <v-icon>mdi-trash-can-outline</v-icon>
                    </v-list-item-icon>
                    <v-list-item-content>
                        <v-list-item-title>Trash</v-list-item-title>
                    </v-list-item-content>
                </v-list-item>
                <v-list-item @click="promptUpload" v-if="$vuetify.breakpoint.mobile">
                    <v-list-item-icon>
                        <v-progress-circular :size="25" :width="2" indeterminate v-if="uploadLoading"/>
                        <v-icon v-else>mdi-upload-outline</v-icon>
                    </v-list-item-icon>
                    <v-list-item-content>
                        <v-list-item-title>Upload</v-list-item-title>
                    </v-list-item-content>
                </v-list-item>
                <v-list-item @click="logout">
                    <v-list-item-icon>
                        <v-icon>mdi-face</v-icon>
                    </v-list-item-icon>
                    <v-list-item-content>
                        <v-list-item-title>Log out</v-list-item-title>
                    </v-list-item-content>
                </v-list-item>
            </v-list>
        </v-menu>
    </v-app-bar>
</template>

<script lang="ts">
import {api, months, shortMonths} from "@/ts/constants";
import Vue from "vue";

export default Vue.extend({
    name: "AppBar",
    data: () => ({
        searchTip: '',
        query: '',
        querySelect: null as string | null,
        loadingSuggestions: false,
        items: [] as string[],
        showMenu: false,
        uploadLoading: false,
    }),
    async mounted() {
        if (this.$route.params.query) {
            this.query = this.$route.params.query;
            this.items = [this.query];
            this.querySelect = this.query;
        }
        this.$store.dispatch('apiRequest', {url: 'photos/searchTip'})
            .then(tip => this.searchTip = tip?.text ?? '');
    },
    methods: {
        promptUpload() {
            let element = document.createElement('input');
            element.setAttribute('type', 'file');
            element.setAttribute('multiple', '');
            element.setAttribute('accept', 'image/*');
            element.style.display = 'none';
            document.body.appendChild(element);
            element.click();
            element.addEventListener('change', async () => {
                this.uploadLoading = true;
                element.remove();
                let files = element.files ?? [];
                if (files.length === 0) return;
                const data = new FormData();

                data.append('email', this.$store.state.email)
                data.append('password', this.$store.state.password)
                for (let i = 0; i < files.length; i++) {
                    const file = files[i];
                    console.log("appending file", file);
                    data.append('media', file, file.name);
                }

                let result = await fetch(`${api}/photos/upload`, {
                    method: 'POST',
                    body: data,
                }).then(r => r.text());
                try {
                    let uploadResult = JSON.parse(result);
                    console.log('uplaod result', uploadResult);
                    if (uploadResult.success) {
                        this.$store.commit('uploadResults', uploadResult.results.map((r: any, i: number) => ({
                            file: files[i].name,
                            result: r
                        })));
                        this.$store.commit('clearCachedPhotos');
                        if (this.$route.name !== 'Upload')
                            await this.$router.push('/upload');
                    } else {
                        await this.$store.dispatch('addSnack', {text: 'Upload failed!'});
                    }
                } catch (e) {
                    await this.$store.dispatch('addSnack', {text: `Upload failed! ${result}`});
                    console.warn("result error", e, result);
                } finally {
                    this.showMenu = false;
                    this.uploadLoading = false;
                }
            }, {once: true})
        },
        logout() {
            this.$store.commit('login', {email: '', password: ''});
            location.reload();
        },

        enterPressed() {
            this.querySelect = this.query
            let searchComponent: any = this.$refs.search;
            searchComponent.isMenuActive = false;
        },
        async loadSuggestions() {
            this.loadingSuggestions = true;
            this.items = [this.query];
            this.loadingSuggestions = false;
            let query = this.query;
            let suggestions = await this.$store.dispatch('apiRequest', {
                url: `photos/suggestions?q=${query}`
            });
            // this.items = results.map((r: any) => ({
            //     text: r.text,
            // }));
            let items = suggestions.map((r: any) => r.text);
            if (!items.includes(query)) {
                items.unshift(query);
            }
            this.items = items;
        },
        isDate(query: string) {
            const lowerQuery = query.toLowerCase();
            let lowerMonths = [...months, ...shortMonths].map(m => m.toLowerCase());
            if (lowerMonths.includes(lowerQuery))
                return {type: 'month', month: (lowerMonths.indexOf(lowerQuery) % 12) + 1};

            let parts = lowerQuery.split(/[- _\/]/).filter(n => n.length !== 0);
            if (parts.length !== 2)
                return {type: 'none'};

            // Format is now either [6 jan] [jan 6] [6 1] [24 6]
            let writtenMonthFirst = lowerMonths.includes(parts[0]);
            let writtenMonthSecond = lowerMonths.includes(parts[1]);
            let highNumberSecond = (+parts[1] > 12 && +parts[0] <= 12);
            if (writtenMonthFirst && +parts[1] <= 31 && +parts[1] >= 0) {
                // jan 6
                return {type: 'dayMonth', month: (lowerMonths.indexOf(parts[0]) % 12) + 1, day: +parts[1]};
            } else if (writtenMonthSecond && +parts[0] <= 31 && +parts[0] >= 0) {
                // 6 jan
                return {type: 'dayMonth', month: (lowerMonths.indexOf(parts[1]) % 12) + 1, day: +parts[0]};
            } else if (highNumberSecond && +parts[0] <= 12 && +parts[0] >= 0 && +parts[1] <= 31 && +parts[1] >= 0) {
                // 6 18
                return {type: 'dayMonth', month: +parts[0], day: +parts[1]};
            } else if (+parts[0] <= 31 && +parts[0] >= 0 && +parts[1] <= 12 && +parts[1] >= 0) {
                // 26 1
                return {type: 'dayMonth', month: +parts[1], day: +parts[0]};
            }

            return {type: 'none'};
        },
        isScrubDate(query: string) {
            let firstIsNumber = !isNaN(+query[0]);
            if (!firstIsNumber) {
                let startsWithMonth = false;
                for (let month of shortMonths) {
                    if (query.startsWith(month)) {
                        startsWithMonth = true;
                        break;
                    }
                }
                if (!startsWithMonth)
                    return {isDate: false, date: new Date}
            }
            let date = new Date(query);
            return {isDate: !isNaN(date.getDate()), date};
        },
        startSearch() {
            if (this.querySelect === '' || this.querySelect === undefined || this.querySelect === null)
                return;
            let newPath = null;


            let {type, month, day} = this.isDate(this.querySelect);
            if (type === 'month') {
                newPath = `/date/${months[(month ?? 1) - 1]}`
            } else if (type === 'dayMonth') {
                newPath = `/date/${day}/${months[(month ?? 1) - 1]}`
            } else {
                let {isDate, date} = this.isScrubDate(this.querySelect);
                if (isDate) {
                    newPath = `/?date=${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
                } else {
                    if (this.$route.name === 'Search') {
                        newPath = `/search/${this.querySelect}`;
                    } else
                        newPath = `/search/${this.querySelect}`;
                }
            }

            if (this.$route.path !== newPath && newPath !== null)
                this.$router.push(newPath);
        },
    },
    watch: {
        querySelect(val) {
            if (val === null) return;
            this.startSearch();
        },
        query(val) {
            if (val && val !== this.querySelect)
                this.loadSuggestions();
        },
        '$route.params.query'() {
            this.query = this.$route.params.query;
            this.querySelect = this.query;
        },
    }
});
</script>

<style scoped>
.home-link {
    display: inline-flex;
    height: 100%;
    align-items: center;
}

.logo-icon {
    height: 80%;
    width: auto;
    margin-left: 10px;
    margin-right: 10px;
}

.logo-text {
    margin-left: 10px;
}

.logo-text >>> * {
    width: auto !important;
}

.theme-switch {
    display: flex;
    align-items: center;
    justify-content: space-between;
}
</style>
