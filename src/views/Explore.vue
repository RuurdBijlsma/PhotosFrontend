<template>
    <div class="explore"
         :style="{maxHeight: `calc(100vh - ${$vuetify.application.top + $vuetify.application.bottom}px)`}">
        <h3 class="mb-6 text-center">Explore</h3>
        <v-divider/>

        <h3 class="mt-5">Places</h3>
        <perfect-scrollbar class="grid">
            <router-link v-for="place in places" :key="place.text" class="item" :to="`/search/${place.text}`">
                <v-img class="item-img" :src="`${api}/photo/tiny/${place.MediumId}.webp`"
                       gradient="to top right, rgba(50,62,100,.5), rgba(25,32,72,0)">
                    <div class="item-text">{{ place.text }}</div>
                </v-img>
            </router-link>
        </perfect-scrollbar>

        <h3 class="mt-5">Things</h3>
        <perfect-scrollbar class="grid">
            <router-link v-for="label in labels" :key="label.text" class="item" :to="`/search/${label.text}`">
                <v-img class="item-img" :src="`${api}/photo/tiny/${label.MediumId}.webp`"
                       gradient="to top right, rgba(50,62,100,.5), rgba(25,32,72,0)">
                    <div class="item-text">{{ label.text }}</div>
                </v-img>
            </router-link>
        </perfect-scrollbar>

        <v-divider class="mt-5"/>

        <div class="bottom-stuff" :style="{
            display: $vuetify.breakpoint.width < 1000 ? 'block' : 'flex',
        }">
            <v-list rounded>
                <v-subheader>Your activity</v-subheader>
                <v-list-item to="/favorites">
                    <v-list-item-icon>
                        <v-icon>mdi-star-outline</v-icon>
                    </v-list-item-icon>
                    <v-list-item-title>Favorites</v-list-item-title>
                </v-list-item>
                <v-list-item to="/recently-added">
                    <v-list-item-icon>
                        <v-icon>mdi-clock-outline</v-icon>
                    </v-list-item-icon>
                    <v-list-item-title>Recently added</v-list-item-title>
                </v-list-item>
            </v-list>
            <v-list rounded>
                <v-subheader>Creations</v-subheader>
                <v-list-item to="/albums">
                    <v-list-item-icon>
                        <v-icon>mdi-album</v-icon>
                    </v-list-item-icon>
                    <v-list-item-title>Albums</v-list-item-title>
                </v-list-item>
            </v-list>
            <v-list rounded>
                <v-subheader>Categories</v-subheader>
                <v-list-item to="/category/slowmotion">
                    <v-list-item-icon>
                        <v-icon>mdi-motion-play-outline</v-icon>
                    </v-list-item-icon>
                    <v-list-item-title>Slowmotion</v-list-item-title>
                </v-list-item>
                <v-list-item to="/category/sphere">
                    <v-list-item-icon>
                        <v-icon>mdi-rotate-3d-variant</v-icon>
                    </v-list-item-icon>
                    <v-list-item-title>Photo Sphere</v-list-item-title>
                </v-list-item>
                <v-list-item to="/category/sphere">
                    <v-list-item-icon>
                        <v-icon>mdi-blur</v-icon>
                    </v-list-item-icon>
                    <v-list-item-title>Portrait</v-list-item-title>
                </v-list-item>
            </v-list>
        </div>
    </div>
</template>

<script>
import {api} from "@/ts/constants";

export default {
    name: "Explore",
    data: () => ({
        labels: [],
        places: [],
        api,
    }),
    async mounted() {
        if (localStorage.getItem('labelsAndPlaces') !== null) {
            let {labels, places} = JSON.parse(localStorage.labelsAndPlaces);
            this.labels = labels;
            this.places = places;
        }
        [this.labels, this.places] = await Promise.all([
            this.$store.dispatch('apiRequest', {url: 'photos/labels'}),
            this.$store.dispatch('apiRequest', {url: 'photos/locations'}),
        ]);
        console.log(this.labels, this.places);
        localStorage.labelsAndPlaces = JSON.stringify({labels: this.labels, places: this.places});
    },
}
</script>

<style scoped>
.explore {
    padding: 30px;
    overflow-y: auto;
    width: 100%;
}

.grid {
    position: relative;
    display: flex;
    width: calc(100% + 100px);
    margin-left: -50px;
    padding: 20px 50px;
}

.item {
    width: 150px;
    min-width: 150px;
    height: 150px;
    display: flex;
    flex-direction: column;
    margin-right: 10px;
}

.item:last-child {
    margin-right: 0;
}

.item-img {
    min-width: 150px;
    width: 100%;
    height: 100%;
    border-radius: 10px;
}

.item-text {
    position: absolute;
    bottom: 10px;
    width: 100%;
    text-align: center;
    color: white;
    font-weight: bolder;
    font-size: 14px;
}

.bottom-stuff {
    margin-top: 40px;
    display: flex;
    justify-content: space-evenly;
}
</style>
