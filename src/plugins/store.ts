import Vue from 'vue'
import Vuex from 'vuex'
import {api} from "@/ts/constants"
import VuexPersistence from "vuex-persist"
import {Media} from "@/ts/Media";

const vuexLocal = new VuexPersistence({
    reducer: (state: any) => ({
        email: state.email,
        password: state.password,
        verifiedLogin: state.verifiedLogin,
        showInfo: state.showInfo,
        mapboxKey: state.mapboxKey,
    }),
    storage: window.localStorage,
})

Vue.use(Vuex)

export default new Vuex.Store({
    state: {
        api,
        reloadPhotos: false,
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
        showInfo: true,
        mapboxKey: '',
        cachedPhotos: {} as any,
    },
    getters: {
        isLoggedIn: state => state.email !== '' && state.password !== '',
    },
    mutations: {
        searchResultsHigh: (state, v: Media[]) => state.searchResults.high = v,
        searchResultsLow: (state, v: Media[]) => state.searchResults.low = v,
        searchType: (state, v: string | null) => state.searchResults.searchType = v,
        glossary: (state, v: string) => state.searchResults.glossary = v,
        placeName: (state, v: string) => state.searchResults.placeName = v,
        mapboxKey: (state, v: string) => state.mapboxKey = v,

        showInfo: (state, v: boolean) => state.showInfo = v,
        reloadPhotos: (state, reloadPhotos: boolean) => state.reloadPhotos = reloadPhotos,
        scrollToTop: (state, scrollToTop: boolean) => state.scrollToTop = scrollToTop,
        keepInView: (state, keepInView: Media | null) => state.keepInView = keepInView,
        viewerQueue: (state, queue: Media[]) => state.viewerQueue = queue,
        dateResults: (state, v: Media[]) => state.dateResults = v,
        cachedPhotos: (state, o: { key: string, media: Media[] }) => Vue.set(state.cachedPhotos, o.key, o.media),
        login: (state, {email, password}) => {
            state.email = email;
            state.password = password;
        },
    },
    actions: {
        async getCachedPhotos({state, dispatch}, o: { year: number, month: number }): Promise<Media[]> {
            let key = o.year.toString() + o.month;
            if (state.cachedPhotos.hasOwnProperty(key)) {
                return state.cachedPhotos[key] as Media[];
            }
            let photos = await dispatch('apiRequest', {
                url: 'photos/month-photos',
                body: {month: [o.year, o.month]}
            });
            return photos.map(Media.fromObject);
        },
        apiRequest: async ({state, getters}, {url, body = {}}): Promise<any> => {
            if (!getters.isLoggedIn)
                return {loggedIn: false, result: null};

            let txt = await fetch(`${state.api}/${url}`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({auth: {email: state.email, password: state.password}, ...body}),
            }).then(j => j.text());

            try {
                return JSON.parse(txt);
            } catch (e) {
                console.warn("Can't parse", {url, txt});
                return null;
            }
        },
        async checkLogin({state, commit}, {email, password}) {
            let result = await fetch(`${state.api}/auth`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({auth: {email, password}}),
            }).then(r => r.json());
            commit('login', {email, password});
            return result;
        },
        async dateSearch({dispatch, commit, state}, {
            day = null as number | null,
            month = null as number | null,
        }) {
            let result = await dispatch('apiRequest', {url: `photos/dateSearch?m=${month}&d=${day}`});
            let items = result.map(Media.fromObject);
            commit('dateResults', items);
        },
        async search({dispatch, commit, state}, query: string) {
            let {results, info, type} = await dispatch('apiRequest', {url: `photos/search?q=${query}`});
            console.log({results, info, type})
            commit('searchType', type);
            if (type === 'label')
                commit('glossary', info);
            else if (type === 'place')
                commit('placeName', info);
            let meanRank = results.map((r: any) => r.rank).reduce((a: number, b: number) => a + b, 0) / results.length;
            const threshold = Math.min(meanRank, 1.2);
            let itemsLow = results.filter((r: any) => r.rank < threshold).map(Media.fromObject);
            let itemsHigh = results.filter((r: any) => r.rank >= threshold).map(Media.fromObject);
            commit('searchResultsLow', itemsLow);
            commit('searchResultsHigh', itemsHigh);
        },
    },
    modules: {},
    plugins: [vuexLocal.plugin],
})
