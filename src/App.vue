<template>
    <v-app>
        <v-app-bar app dark elevation="0">

            <v-spacer></v-spacer>

            <v-text-field dense solo-inverted hide-details label="Search..." prepend-icon="mdi-magnify"/>

            <v-spacer></v-spacer>

            <v-btn icon>
                <v-icon>mdi-cog</v-icon>
            </v-btn>
        </v-app-bar>

        <v-navigation-drawer permanent app>
            <div class="logo">
                <img class="logo-icon" src="./assets/192icon.png" alt="icon"/>
                <span class="logo-text">Photos</span>
            </div>

            <v-divider></v-divider>

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
                        <v-icon>mdi-earth</v-icon>
                    </v-list-item-icon>

                    <v-list-item-content>
                        <v-list-item-title>Explore</v-list-item-title>
                    </v-list-item-content>
                </v-list-item>
                <v-list-item to="/map" exact>
                    <v-list-item-icon>
                        <v-icon>mdi-map-marker-circle</v-icon>
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
        //
    }),
});
</script>

<style>
.logo {
    width: 100%;
    height: 65px;
    display: flex;
    align-items: center;
}

.logo-icon {
    height: 80%;
    width: auto;
    margin-left: 10px;
}

.logo-text {
    font-weight: thin;
    font-size: 25px;
    margin-left: 20px;
}
</style>
