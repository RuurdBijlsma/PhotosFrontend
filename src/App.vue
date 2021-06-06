<template>
    <v-app class="app">
        <v-app-bar elevation="0" app clipped-left>
            <img class="logo-icon" src="./assets/transparent-color-icon-256.png" alt="icon">
            <v-app-bar-title class="logo-text">Photos</v-app-bar-title>

            <v-spacer></v-spacer>

            <v-autocomplete dense solo hide-details label="Search..."
                            prepend-icon="mdi-magnify" hide-no-data
                            :loading="loadingSuggestions"
                            :items="items"
                            clearable
                            @keypress.enter="enterPressed"
                            ref="search"
                            return-object
                            :search-input.sync="query"
                            v-model="querySelect"/>

            <v-spacer/>

            <v-menu :close-on-content-click="false">
                <template v-slot:activator="{ on, attrs }">
                    <v-btn icon>
                        <v-icon v-bind="attrs" v-on="on">mdi-cog-outline</v-icon>
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
                </v-list>
            </v-menu>
        </v-app-bar>

        <v-navigation-drawer :expand-on-hover="true"
                             permanent app
                             v-if="!$vuetify.breakpoint.mobile"
                             floating clipped
                             hide-overlay>
            <v-list dense nav>
                <v-list-item v-for="page in pages" exact :to="page.to" :key="page.to"
                             @click="scrollToTop">
                    <v-list-item-icon>
                        <v-icon>{{ page.icon }}</v-icon>
                    </v-list-item-icon>
                    <v-list-item-content>
                        <v-list-item-title>{{ page.name }}</v-list-item-title>
                    </v-list-item-content>
                </v-list-item>
            </v-list>
        </v-navigation-drawer>

        <v-main>
            <router-view/>
        </v-main>

        <v-bottom-navigation app v-if="$vuetify.breakpoint.mobile" shift>
            <v-btn v-for="page in pages" :to="page.to" :key="page.to"
                   @click="scrollToTop">
                <span>{{ page.name }}</span>
                <v-icon>{{ page.icon }}</v-icon>
            </v-btn>
        </v-bottom-navigation>
    </v-app>
</template>

<script lang="ts">
import Vue from 'vue';
import {months, shortMonths} from "@/ts/utils";

export default Vue.extend({
    name: 'App',

    data: () => ({
        query: '',
        querySelect: null as string | null,
        loadingSuggestions: false,
        items: [] as string[],
        pages: [
            {name: 'Home', icon: 'mdi-home-outline', to: '/'},
            {name: 'Explore', icon: 'mdi-magnify', to: '/explore'},
            {name: 'Photo map', icon: 'mdi-earth', to: '/map'},
        ],
    }),
    async mounted() {
        if (!this.$store.getters.isLoggedIn && this.$route.name !== 'Login')
            await this.$router.push('/login');
        if (this.$route.params.query) {
            this.query = this.$route.params.query;
            this.items = [this.query];
            this.querySelect = this.query;
        }
        console.log(this.$store);
    },
    methods: {
        scrollToTop() {
            if (this.$route.name === 'Home') {
                console.log('scrollint to top"');
                this.$store.commit('scrollToTop', true);
            }
        },
        enterPressed() {
            this.querySelect = this.query
            let searchComponent: any = this.$refs.search;
            searchComponent.isMenuActive = false;
            this.startSearch();
        },
        async loadSuggestions() {
            this.loadingSuggestions = true;
            this.items = [this.query];
            this.loadingSuggestions = false;
            let query = this.query;
            let results = await this.$store.dispatch('apiRequest', {
                url: `photos/suggestions?q=${query}`
            });
            // this.items = results.map((r: any) => ({
            //     text: r.text,
            // }));
            let items = results.map((r: any) => r.text);
            if (!items.includes(query)) {
                items.unshift(query);
            }
            this.items = items;
            console.log(results);
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
            console.log({type, month, day});
            if (type === 'month') {
                newPath = `/date/${months[(month ?? 1) - 1]}`
            } else if (type === 'dayMonth') {
                newPath = `/date/${day}/${months[(month ?? 1) - 1]}`
            } else {
                let {isDate, date} = this.isScrubDate(this.querySelect);
                if (isDate) {
                    newPath = `/?date=${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
                } else {
                    if (this.$route.params.query === this.querySelect) {
                        this.$store.dispatch('search', this.querySelect);
                    } else if (this.$route.name === 'Search') {
                        // this.$store.dispatch('search', this.query);
                        newPath = `/search/${this.querySelect}`;
                    } else
                        newPath = `/search/${this.querySelect}`;
                }
            }

            if (this.$route.path !== newPath && newPath !== null)
                this.$router.push(newPath);
        },
        page() {
            return this.pages.findIndex(p => p.to === this.$route.path);
        },
    },
    watch: {
        querySelect(val) {
            if (val === null) return;
            console.log("Search!", val);
            // this.query = val;
            console.log(this.querySelect);
            this.startSearch();
        },
        query(val) {
            if (val && val !== this.querySelect)
                this.loadSuggestions();
        },
        '$route.params.query'() {
            this.query = this.$route.params.query;
            this.querySelect = this.query;
        }
    }
});
</script>

<style>
@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@100;300;400;500;600;700&display=swap');

html, body {
    overflow-y: hidden !important;
    user-select: none;
}
.v-application{
    font-family: 'Montserrat', 'Roboto', Arial, sans-serif !important;
}
.roboto{
    font-family: 'Roboto', Arial, sans-serif !important;
}
.no-style {
    text-decoration: none;
    color: inherit !important;
}

.logo-icon {
    height: 80%;
    width: auto;
    margin-left: 10px;
}

.logo-text {
    margin-left: 20px;
}

.logo-text > * {
    min-width: 100% !important;
}

.theme-switch {
    display: flex;
    align-items: center;
    justify-content: space-between;
}
</style>
