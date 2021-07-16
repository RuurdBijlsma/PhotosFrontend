<template>
    <v-app class="app">
        <app-bar/>

        <v-navigation-drawer :expand-on-hover="$vuetify.breakpoint.width < 1600"
                             :width="180"
                             permanent app
                             v-if="!$vuetify.breakpoint.mobile"
                             clipped
                             hide-overlay>
            <v-list dense nav rounded>
                <v-list-item v-for="page in pages" exact
                             :to="page.to" :key="page.to"
                             @mousedown="scrollToTop">
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

        <v-snackbar v-for="snack in $store.state.snackbars"
                    :key="snack.id" app
                    v-model="snack.open" :timeout="snack.timeout"
                    color="secondary">
            {{ snack.text }}
            <template v-slot:action="{ attrs }">
                <v-btn v-if="snack.to !== null" text v-bind="attrs" :to="snack.to">
                    {{ snack.toText }}
                </v-btn>
                <v-btn text v-bind="attrs"
                       @click="snack.open = false">
                    Dismiss
                </v-btn>
            </template>
        </v-snackbar>
        <custom-dialog/>

        <v-bottom-navigation app v-if="$vuetify.breakpoint.mobile" shift>
            <v-btn :style="{height: 'inherit !important'}"
                   v-for="page in pages"
                   :to="page.to"
                   :key="page.to"
                   @click="scrollToTop">
                <span>{{ page.name }}</span>
                <v-icon>{{ page.icon }}</v-icon>
            </v-btn>
        </v-bottom-navigation>

        <selection-info/>
    </v-app>
</template>

<script lang="ts">
import Vue from 'vue';
import {api, months, shortMonths} from "@/ts/constants";
import CustomDialog from "@/components/CustomDialog.vue";
import SelectionInfo from "@/components/SelectionInfo.vue";
import AppBar from "@/components/AppBar.vue";

export default Vue.extend({
    name: 'App',
    components: {AppBar, SelectionInfo, CustomDialog},
    data: () => ({
        pages: [
            {name: 'Home', icon: 'mdi-home-outline', to: '/'},
            {name: 'Explore', icon: 'mdi-magnify', to: '/explore'},
            {name: 'Photo map', icon: 'mdi-earth', to: '/map'},
        ],
    }),
    async mounted() {
        if (!this.$store.getters.isLoggedIn && this.$route.name !== 'Login')
            await this.$router.push('/login');
        console.log('window.store = ', this.$store);
        // @ts-ignore
        window.store = this.$store;
    },
    methods: {
        scrollToTop() {
            if (this.$route.name === 'Home') {
                this.$store.commit('scrollToTop', true);
            }
        },
        page() {
            return this.pages.findIndex(p => p.to === this.$route.path);
        },
    },
    watch: {
        '$vuetify.theme.dark'() {
            localStorage.darkTheme = this.$vuetify.theme.dark;
        },
    }
});
</script>

<style>
@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@100;300;400;500;600;700&display=swap');

html, body {
    overflow-y: hidden !important;
    user-select: none;
}

.v-application {
    font-family: 'Montserrat', 'Roboto', Arial, sans-serif !important;
}

.roboto {
    font-family: 'Roboto', Arial, sans-serif !important;
}

.no-style {
    text-decoration: none;
    color: inherit !important;
}

.v-navigation-drawer {
    z-index: 6 !important;
}

.leaflet-pane {
    z-index: 4 !important;
}

.leaflet-top, .leaflet-bottom {
    z-index: 5 !important;
}
</style>
