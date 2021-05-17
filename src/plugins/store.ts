import Vue from 'vue'
import Vuex from 'vuex'

Vue.use(Vuex)

export default new Vuex.Store({
    state: {
        api: 'http://localhost:3000',
    },
    mutations: {},
    actions: {
        async getPhotos({state}, {limit=50, offset=0}) {
            let res = await fetch(`${state.api}/photos/list?limit=${limit}&offset=${offset}`).then(f => f.text());
            try {

                return JSON.parse(res);
            } catch (e) {
                console.warn(`Can't parse api response ${res}`, e);
            }
        },
    },
    modules: {}
})
