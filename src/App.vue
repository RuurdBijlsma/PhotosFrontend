<template>
    <v-app class="app">
        <v-app-bar elevation="0" app clipped-left>
            <img class="logo-icon" src="./assets/transparent-icon-512.png" alt="icon">
            <v-app-bar-title class="logo-text">Photos</v-app-bar-title>

            <v-spacer></v-spacer>

            <v-text-field dense solo hide-details @keydown.enter="startSearch" label="Search..."
                          v-model="query" append-icon="mdi-magnify"/>

            <v-spacer></v-spacer>

            <v-btn icon>
                <v-icon>mdi-cog</v-icon>
            </v-btn>
        </v-app-bar>

        <v-navigation-drawer :expand-on-hover="true" permanent app floating clipped hide-overlay>
            <v-list dense nav>
                <v-list-item to="/" exact>
                    <v-list-item-icon>
                        <v-icon>mdi-home-outline</v-icon>
                    </v-list-item-icon>

                    <v-list-item-content>
                        <v-list-item-title>Photos</v-list-item-title>
                    </v-list-item-content>
                </v-list-item>
                <v-list-item to="/explore" exact>
                    <v-list-item-icon>
                        <v-icon>mdi-magnify</v-icon>
                    </v-list-item-icon>

                    <v-list-item-content>
                        <v-list-item-title>Explore</v-list-item-title>
                    </v-list-item-content>
                </v-list-item>
                <v-list-item to="/map" exact>
                    <v-list-item-icon>
                        <v-icon>mdi-earth</v-icon>
                    </v-list-item-icon>

                    <v-list-item-content>
                        <v-list-item-title>Photo map</v-list-item-title>
                    </v-list-item-content>
                </v-list-item>
            </v-list>
        </v-navigation-drawer>

        <v-main>
            <router-view/>
        </v-main>
    </v-app>
</template>

<script lang="ts">
import Vue from 'vue';

export default Vue.extend({
    name: 'App',

    data: () => ({
        query: '',
    }),
    async mounted() {
        if (this.$route.params.query) {
            console.warn('setting query')
            this.query = this.$route.params.query;
        }
        if (!this.$store.getters.isLoggedIn && this.$route.name !== 'Login')
            await this.$router.push('/login');
        console.log(this.$store);
    },
    methods: {
        startSearch() {
            if (this.query === '' || this.query === undefined)
                return;
            if (this.$route.params.query === this.query) {
                this.$store.dispatch('search', this.query);
            } else if (this.$route.name === 'Search') {
                this.$router.push(`/search/${this.query}`)
                this.$store.dispatch('search', this.query);
            } else
                this.$router.push({
                    path: `/search/${this.query}`,
                })
        },
    },
    watch: {
        '$route.params.query'() {
            this.query = this.$route.params.query;
        }
    }
});
</script>

<style>
html, body {
    font-family: Roboto, Arial, sans-serif;
    overflow-y: hidden !important;
    user-select: none;
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
</style>
