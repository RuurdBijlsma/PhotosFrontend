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
            isLabel: false,
            glossary: '',
        },
        dateResults: [] as Media[],
        email: '',
        password: '',
        viewerQueue: [] as Media[],
        keepInView: null as Media | null,
        showInfo: true,
    },
    getters: {
        isLoggedIn: state => state.email !== '' && state.password !== '',
    },
    mutations: {
        showInfo: (state, v: boolean) => state.showInfo = v,
        reloadPhotos: (state, reloadPhotos: boolean) => state.reloadPhotos = reloadPhotos,
        scrollToTop: (state, scrollToTop: boolean) => state.scrollToTop = scrollToTop,
        keepInView: (state, keepInView: Media | null) => state.keepInView = keepInView,
        viewerQueue: (state, queue: Media[]) => state.viewerQueue = queue,
        dateResults: (state, v: Media[]) => state.dateResults = v,
        searchResultsHigh: (state, v: Media[]) => state.searchResults.high = v,
        searchResultsLow: (state, v: Media[]) => state.searchResults.low = v,
        isLabel: (state, v: boolean) => state.searchResults.isLabel = v,
        glossary: (state, v: string) => state.searchResults.glossary = v,
        login: (state, {email, password}) => {
            state.email = email;
            state.password = password;
        },
    },
    actions: {
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
            let [glossInfo, result] = await Promise.all([
                dispatch('apiRequest', {url: `photos/defineLabel/${query}`}),
                dispatch('apiRequest', {url: `photos/search?q=${query}`}),
            ]);
            console.log(glossInfo);
            commit('isLabel', glossInfo.isLabel ?? false);
            if (glossInfo.isLabel && glossInfo.glossary !== undefined && glossInfo.glossary !== null) {
                commit('glossary', glossInfo.glossary);
            }
            let meanRank = result.map((r: any) => r.rank).reduce((a: number, b: number) => a + b, 0) / result.length;
            const threshold = Math.min(meanRank, 1.2);
            let itemsLow = result.filter((r: any) => r.rank < threshold).map(Media.fromObject);
            let itemsHigh = result.filter((r: any) => r.rank >= threshold).map(Media.fromObject);
            commit('searchResultsLow', itemsLow);
            commit('searchResultsHigh', itemsHigh);
        },
    },
    modules: {},
    plugins: [vuexLocal.plugin],
})
