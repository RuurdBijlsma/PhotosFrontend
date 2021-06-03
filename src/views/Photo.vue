<template>
    <div class="media-photo">
        <div class="left-pane">
            <div class="controls">
                <div class="control-top">
                    <div class="control-top-left">
                        <v-btn large icon dark @click="close">
                            <v-icon>mdi-arrow-left</v-icon>
                        </v-btn>
                    </div>
                    <div class="control-top-right">
                        <v-btn large icon dark @click="showInfo = !showInfo">
                            <v-icon>mdi-information-outline</v-icon>
                        </v-btn>
                    </div>
                </div>
                <div class="control-mid">
                    <v-btn fab dark :disabled="!canSkipLeft" @click="previous">
                        <v-icon>mdi-chevron-left</v-icon>
                    </v-btn>
                    <v-btn fab dark :disabled="!canSkipRight" @click="next">
                        <v-icon>mdi-chevron-right</v-icon>
                    </v-btn>
                </div>
            </div>

            <!--            <div-->
            <!--                :style="{backgroundImage: `url(${api}/photos/full/${media.id})`}"-->
            <!--                class="media-item media-div"-->
            <!--                v-if="media && media.type === 'photo'"/>-->
            <v-img
                :lazy-src="`${api}/photos/tiny/${media.id}.webp`"
                :src="`${api}/photos/big/${media.id}.webp`"
                :key="media.id"
                class="media-item"
                contain
                v-if="media && media.type === 'photo'"/>
            <video class="media-item" :poster="`${api}/photos/big/${media.id}.webp`"
                   controls
                   autoplay
                   :ref="`video${media.id}`" v-else-if="media"
                   :src="`${api}/photos/webm/${media.id}.webm`"></video>
        </div>
        <v-sheet class="right-pane" :style="{
            marginRight: showInfo ? '0' : '-400px',
        }">
            <div class="info-header">
                <v-btn @click="showInfo = false" icon>
                    <v-icon>mdi-close</v-icon>
                </v-btn>
                <span>Info</span>
            </div>
            <v-subheader class="subheader-caption">DETAILS</v-subheader>
            <div class="info-content" v-if="media">
                <div>{{ media.createDate }}</div>
                <div v-if="media.filename">{{ media.filename }}</div>
                <div>{{ media.width }} × {{ media.height }}</div>
                <div v-if="media.classifications && media.classifications.length > 0">
                    {{ media.classifications[0].levels[0] }}
                </div>
                <div v-if="media.location">{{ media.location }}</div>
            </div>
        </v-sheet>
    </div>
</template>

<script lang="ts">
import Vue from 'vue'
import {api} from "@/ts/constants"
import {Media} from "@/ts/Media";

export default Vue.extend({
    name: 'Photo',
    props: {},
    data: () => ({
        api,
        media: null as Media | null,
        showInfo: true,
        isLoading: new Set(),
    }),
    beforeDestroy() {
    },
    async mounted() {
        this.media = this.queue.find(i => i.id === this.id) ?? null;
        await this.fullMediaLoad();
        this.$store.commit('keepInView', this.media);
    },
    methods: {
        close() {
            let path = this.$route.path.split('/').filter(p => p.length !== 0);
            console.log(path);
            let newPath = '/' + path.slice(0, path.length - 2).join('/');
            this.$router.push(newPath);
        },
        previous() {
            let prev = this.queue[this.index - 1];
            if (!prev) return;
            this.media = prev;
            this.$store.commit('keepInView', this.media);
            this.fullMediaLoad();
            let path = this.$route.path.split('/');
            this.$router.replace([...path.slice(0, path.length - 1), prev.id].join('/'));
        },
        next() {
            let next = this.queue[this.index + 1];
            if (!next) return;
            this.media = next;
            this.$store.commit('keepInView', this.media);
            this.fullMediaLoad();
            let path = this.$route.path.split('/');
            this.$router.replace([...path.slice(0, path.length - 1), next.id].join('/'));
        },
        async fullMediaLoad() {
            let id = this.media?.id ?? this.id;
            if (this.isLoading.has(id))
                return;
            this.isLoading.add(id);

            let media = await this.$store.dispatch('apiRequest', {url: `photos/${id}`}).then(Media.fromObject);
            if (this.media === null || id === this.media?.id) {
                console.log(media);
                this.media = media;
            }
            this.isLoading.delete(id);
        },
        waitSleep(ms = 1000) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }
    },
    computed: {
        canSkipLeft(): boolean {
            return this.index > 0;
        },
        canSkipRight(): boolean {
            return this.index + 1 < this.queue.length;
        },
        index(): number {
            return this.queue.findIndex(i => i.id === this.id);
        },
        queue(): Media[] {
            return this.$store.state.viewerQueue;
        },
        id() {
            return this.$route.params.id;
        },
    },
    watch: {
        id() {
            this.fullMediaLoad();
        },
    },
})
</script>

<style scoped>
.media-photo {
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    position: fixed;
    background-color: grey;
    z-index: 5;
    display: flex;
}

.left-pane {
    position: relative;
}

.controls {
    width: 100%;
    height: 100%;
    z-index: 6;
    position: absolute;
    display: flex;
    flex-direction: column;
    padding: 15px 25px;
    background-image: linear-gradient(to bottom, rgba(0, 0, 0, 0.7) 0%, transparent 10%);
}

.control-top {
    width: 100%;
    display: flex;
    justify-content: space-between;
}

.control-mid {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-grow: 1;
}

.media-item {
    position: absolute;
    width: 100%;
    height: 100%;
}

.media-div {
    background-repeat: no-repeat;
    background-size: contain;
    background-position: center;
    width: 100%;
    height: 100%;
}

.media-photo > * {
    width: 100%;
    height: 100%;
}

.media-item {
    background-position: center;
    background-size: contain;
    background-color: black;
}

.right-pane {
    transition: margin-right 0.25s;
    width: 400px;
    max-width: 400px;
    min-width: 400px;
    margin-right: 0;
    padding: 20px;
}

.info-content {
    user-select: text;
}

.subheader-caption {
    font-size: 11px;
    text-transform: uppercase;
}

</style>
