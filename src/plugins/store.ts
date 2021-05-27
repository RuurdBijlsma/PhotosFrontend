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
    }),
    storage: window.localStorage,
})

Vue.use(Vuex)

export default new Vuex.Store({
    state: {
        api,
        searchResults: [] as Media[],
        email: '',
        password: '',
    },
    getters: {
        isLoggedIn: state => state.email !== '' && state.password !== '',
    },
    mutations: {
        searchResults: (state, v: Media[]) => state.searchResults = v,
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
        async search({dispatch, commit, state}, query: string) {
            let result = await dispatch('apiRequest', {url: `photos/search?q=${query}`});
            let items = result.map(Media.fromObject);
            console.log(result, items);
            commit('searchResults', items);
        }
    },
    modules: {},
    plugins: [vuexLocal.plugin],
})
