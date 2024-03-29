import Vue from 'vue'
import Vuex from 'vuex'
import {api} from "@/ts/constants"
import VuexPersistence from "vuex-persist"
import {Media} from "@/ts/Media";
import {MonthPhotos} from "@/ts/MediaInterfaces";
import router from "@/plugins/router";
import vuetify from "@/plugins/vuetify";

if (document.querySelectorAll(`head link[rel='manifest']`).length === 0) {
    let manifestLink = document.createElement('link');
    manifestLink.setAttribute('rel', 'manifest');
    manifestLink.setAttribute('href', './manifest.json');
    document.querySelector('head')?.appendChild?.(manifestLink);
}

const vuexLocal = new VuexPersistence({
    reducer: (state: any) => ({
        email: state.email,
        password: state.password,
        verifiedLogin: state.verifiedLogin,
        showInfo: state.showInfo,
        mapboxKey: state.mapboxKey,
        videoMuted: state.videoMuted,
        videoVolume: state.videoVolume,
        google: {
            refreshToken: state.google.refreshToken,
            clientId: state.google.clientId,
            clientSecret: state.google.clientSecret,
        },
    }),
    storage: window.localStorage,
})

Vue.use(Vuex)

export default new Vuex.Store({
    state: {
        google: {
            refreshToken: '',
            clientId: '',
            clientSecret: '',
        },
        api,
        snackbars: [] as any[],
        reloadPhotos: false as boolean | Media,
        scrollToTop: false,
        searchResults: {
            low: [] as Media[],
            high: [] as Media[],
            searchType: null as string | null,
            glossary: '',
            placeName: '',
        },
        dateResults: [] as Media[],
        email: '',
        password: '',
        viewerQueue: [] as Media[],
        keepInView: null as Media | null,
        showInfo: false,
        mapboxKey: '',
        cachedPhotos: {} as any,
        prompt: {
            show: false,
            title: '',
            subtitle: '',
            cancelText: '',
            confirmText: '',
            onConfirm: () => 0,
            onCancel: () => 0,
        },
        photosPerMonth: [] as MonthPhotos[],
        photoSelection: {} as any,
        lastSelectedPhoto: null as Media | null,
        delayedIsSelecting: false,
        uploadResults: [] as { file: string, result: { success: boolean, id: string, error: string } }[],
        albumPrompt: {
            show: false,
            onConfirm: () => 0,
            onCancel: () => 0,
        },
        albums: [],
        viewedAlbum: null,
        updateAlbum: false,
        showPhotoButtons: true,
        videoMuted: false,
        videoVolume: 1,
        videoFullscreen: false,
    },
    mutations: {
        videoFullscreen: (state, value) => state.videoFullscreen = value,
        videoVolume: (state, value) => state.videoVolume = value,
        videoMuted: (state, value) => state.videoMuted = value,
        showPhotoButtons: (state, value) => state.showPhotoButtons = value,
        updateAlbum: (state, value) => state.updateAlbum = value,
        viewedAlbum: (state, value) => state.viewedAlbum = value,
        albums: (state, value) => state.albums = value,
        refreshToken: (state, value) => state.google.refreshToken = value,
        clientId: (state, value) => state.google.clientId = value,
        clientSecret: (state, value) => state.google.clientSecret = value,
        showChooseAlbum: (state, value) => state.albumPrompt.show = value,
        albumPrompt: (state, value) => state.albumPrompt = value,
        uploadResults: (state, value) => state.uploadResults = value,
        delayedIsSelecting: (state, value) => state.delayedIsSelecting = value,
        lastSelectedPhoto: (state, value) => state.lastSelectedPhoto = value,
        clearPhotoSelection: state => state.photoSelection = {},
        removeBatchFromPhotoSelection: (state, medias) => medias.forEach((m: Media) => Vue.delete(state.photoSelection, m.id)),
        addBatchToPhotoSelection: (state, medias) => medias.forEach((m: Media) => Vue.set(state.photoSelection, m.id, m)),
        addToPhotoSelection: (state, media) => Vue.set(state.photoSelection, media.id, media),
        removeFromPhotoSelection: (state, media) => Vue.delete(state.photoSelection, media.id),
        addSnackObject: (state, snack) => state.snackbars.push(snack),
        removeSnack: (state, snack) => state.snackbars.splice(state.snackbars.indexOf(snack), 1),
        searchResultsHigh: (state, v: Media[]) => state.searchResults.high = v,
        searchResultsLow: (state, v: Media[]) => state.searchResults.low = v,
        searchType: (state, v: string | null) => state.searchResults.searchType = v,
        glossary: (state, v: string) => state.searchResults.glossary = v,
        placeName: (state, v: string) => state.searchResults.placeName = v,
        mapboxKey: (state, v: string) => state.mapboxKey = v,

        photosPerMonth: (state, v: MonthPhotos[]) => state.photosPerMonth = v,
        showInfo: (state, v: boolean) => state.showInfo = v,
        reloadPhotos: (state, reloadPhotos: boolean | Media) => {
            state.reloadPhotos = reloadPhotos;
            state.cachedPhotos = {};
        },
        scrollToTop: (state, scrollToTop: boolean) => state.scrollToTop = scrollToTop,
        keepInView: (state, keepInView: Media | null) => state.keepInView = keepInView,
        viewerQueue: (state, queue: Media[]) => state.viewerQueue = queue,
        dateResults: (state, v: Media[]) => state.dateResults = v,
        clearCachedPhotos: state => state.cachedPhotos = {},
        cachedPhotos: (state, o: { key: string, media: Media[] }) => Vue.set(state.cachedPhotos, o.key, o.media),
        login: (state, {email, password}) => {
            state.email = email;
            state.password = password;
        },
        hidePrompt: state => state.prompt.show = false,
        showPrompt: (state, {
            title = 'Are you sure?',
            subtitle = 'There may be unsaved changes',
            cancelText = 'Cancel',
            confirmText = 'Confirm',
            onConfirm = () => 0,
            onCancel = () => 0,
        }) => {
            state.prompt.show = true;
            state.prompt.title = title;
            state.prompt.subtitle = subtitle;
            state.prompt.cancelText = cancelText;
            state.prompt.confirmText = confirmText;
            state.prompt.onConfirm = onConfirm;
            state.prompt.onCancel = onCancel;
        },
    },
    getters: {
        selectedMedias: state => {
            let medias: Media[] = Object.values(state.photoSelection);
            return medias.sort((a: Media, b: Media) => a.createDate.getTime() - b.createDate.getTime());
        },
        isLoggedIn: state => state.email !== '' && state.password !== '',
        isSelected: state => (mediaId: string) => state.photoSelection.hasOwnProperty(mediaId),
        isSelecting: state => Object.keys(state.photoSelection).length > 0,
        selectionHeight: (state, getters) => vuetify.framework.breakpoint.mobile && getters.isSelecting ? 132 : 0,
    },
    actions: {
        async updateAlbums({commit, dispatch}) {
            let albums = await dispatch('apiRequest', {url: 'photos/getAlbums'});
            albums = albums.sort((a: any, b: any) => a.createdAt < b.createdAt ? 1 : -1);
            commit('albums', albums);
        },
        logout({commit}) {
            commit('login', {email: '', password: ''});
            location.reload();
        },
        addSnack: ({state, commit}, {text, toText = 'Go', to = null, timeout = 4000}) => {
            let snack = {text, toText, to, open: true, timeout, id: Math.random()};
            commit('addSnackObject', snack);
            setTimeout(() => {
                commit('removeSnack', snack);
            }, timeout + 500);
            return;
        },
        async showPrompt({commit}, {
            title = 'Are you sure?',
            subtitle = 'This will discard all unsaved changes',
            cancelText = 'Cancel',
            confirmText = 'Confirm',
        }) {
            return new Promise((resolve => {
                commit('showPrompt', {
                    title,
                    subtitle,
                    cancelText,
                    confirmText,
                    onConfirm: () => resolve(true),
                    onCancel: () => resolve(false),
                })
            }));
        },
        async getCachedPhotos({state, dispatch, commit}, o: { year: number, month: number }): Promise<Media[]> {
            let key = o.year.toString() + o.month;
            if (state.cachedPhotos.hasOwnProperty(key)) {
                return state.cachedPhotos[key] as Media[];
            }
            let photos = await dispatch('apiRequest', {
                url: 'photos/month-photos',
                body: {month: [o.year, o.month]}
            });
            let cachedPhotos = photos.map(Media.fromObject);
            commit('cachedPhotos', {key, media: cachedPhotos});
            return cachedPhotos;
        },
        apiRequest: async ({state, getters, dispatch}, {url, body = {}, unauthorizedRequest = false}): Promise<any> => {
            let shouldRedirectIfUnauthorized = !(router.currentRoute.name === null || router.currentRoute.meta?.requiresAuth === false);
            if (!getters.isLoggedIn && !unauthorizedRequest) {
                if (shouldRedirectIfUnauthorized) {
                    await router.replace('/login');
                }
                return;
            }

            let response = await fetch(`${state.api}/${url}`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({auth: {email: state.email, password: state.password}, ...body}),
            });

            if (response.status === 401) {
                if (shouldRedirectIfUnauthorized) {
                    await dispatch('addSnack', {text: 'Your login credentials seem to be incorrect'});
                    await router.push('/login');
                }
                return null;
            }

            let txt = await response.text();
            try {
                return JSON.parse(txt);
            } catch (e) {
                console.warn("Can't parse", {url, txt});
                return null;
            }
        },
        async checkLogin({state, commit}, {email, password, api = null}) {
            let result = await fetch(`${api ?? state.api}/auth`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({auth: {email, password}}),
            }).then(r => r.json());
            commit('login', {email, password});
            return result;
        },
        async search({dispatch, commit, state}, query: string) {
            let {results, info, type} = await dispatch('apiRequest', {url: `photos/search?q=${query}`});
            console.log({results, info, type})
            commit('searchType', type);
            if (type === 'label')
                commit('glossary', info);
            else if (type === 'place')
                commit('placeName', info);
            if (type === 'date' || type === 'subType') {
                commit('searchResultsLow', []);
                commit('searchResultsHigh', results.map(Media.fromObject));
            } else {
                let meanRank = results.map((r: any) => r.rank).reduce((a: number, b: number) => a + b, 0) / results.length;
                const threshold = Math.min(meanRank, 1.2);
                let itemsLow = results.filter((r: any) => r.rank < threshold).map(Media.fromObject);
                let itemsHigh = results.filter((r: any) => r.rank >= threshold).map(Media.fromObject);
                commit('searchResultsLow', itemsLow);
                commit('searchResultsHigh', itemsHigh);
            }
        },
    },
    modules: {},
    plugins: [vuexLocal.plugin],
})
