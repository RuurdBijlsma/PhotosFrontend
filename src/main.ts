import Vue from 'vue'
import App from './App.vue'
import './registerServiceWorker'
import router from './plugins/router'
import store from './plugins/store'
import vuetify from './plugins/vuetify'
import VueZoomer from 'vue-zoomer'


Vue.config.productionTip = false
import PerfectScrollbar from 'vue2-perfect-scrollbar'
import 'vue2-perfect-scrollbar/dist/vue2-perfect-scrollbar.css'
Vue.use(PerfectScrollbar)
Vue.use(VueZoomer)

import 'leaflet/dist/leaflet.css';

new Vue({
    router,
    store,
    vuetify,
    render: h => h(App)
}).$mount('#app')
