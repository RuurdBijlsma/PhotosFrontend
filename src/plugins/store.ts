import Vue from 'vue'
import Vuex from 'vuex'

Vue.use(Vuex)

export default new Vuex.Store({
    state: {
        api: 'http://localhost:3000',
        searchResults: [],
    },
    mutations: {
        searchResults: (state, v) => state.searchResults = v,
    },
    actions: {
        async search({commit, state}, query: string) {
            let results = await fetch(`${state.api}/photos/search?q=${query}`).then(j => j.json());
            commit('searchResults', results);
        }
    },
    modules: {}
})
