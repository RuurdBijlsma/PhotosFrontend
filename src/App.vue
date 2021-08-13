<template>
    <v-app class="app">
        <app-bar/>

        <navigation-drawer
            v-if="$store.getters.isLoggedIn"
            :pages="pages"
            @scroll-to-top="scrollToTop"
        />

        <v-main>
            <router-view/>
        </v-main>

        <v-snackbar v-for="snack in $store.state.snackbars"
                    :key="snack.id" app
                    v-model="snack.open" :timeout="snack.timeout"
                    color="primary">
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
        <album-dialog/>

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
import CustomDialog from "@/components/CustomDialog.vue";
import SelectionInfo from "@/components/SelectionInfo.vue";
import AppBar from "@/components/AppBar.vue";
import AlbumDialog from "@/components/ChooseAlbum.vue";
import NavigationDrawer from "@/components/NavigationDrawer.vue";

export default Vue.extend({
    name: 'App',
    components: {NavigationDrawer, AlbumDialog, AppBar, SelectionInfo, CustomDialog},
    data: () => ({
        pages: [
            {name: 'Photos', icon: 'mdi-image-outline', to: '/'},
            {name: 'Explore', icon: 'mdi-magnify', to: '/explore'},
            {name: 'Photo map', icon: 'mdi-map-outline', to: '/map'},
            {name: 'Albums', icon: 'mdi-image-album', to: '/albums'},
        ],
    }),
    mounted() {
        console.log('window.store = ', this.$store);
        // @ts-ignore
        window.store = this.$store;
        this.$router.onReady(async () => {
            if (!this.$store.getters.isLoggedIn && this.$route?.meta?.requiresAuth !== false) {
                await this.$router.push('/login');
            }
        });
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
