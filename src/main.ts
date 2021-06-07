import Vue from 'vue'
import App from './App.vue'
import './registerServiceWorker'
import router from './plugins/router'
import store from './plugins/store'
import vuetify from './plugins/vuetify'

Vue.config.productionTip = false
import PerfectScrollbar from 'vue2-perfect-scrollbar'
import 'vue2-perfect-scrollbar/dist/vue2-perfect-scrollbar.css'
Vue.use(PerfectScrollbar)

// @ts-ignore
import { LMap, LTileLayer, LMarker } from 'vue2-leaflet';
import 'leaflet/dist/leaflet.css';

new Vue({
    router,
    store,
    vuetify,
    render: h => h(App)
}).$mount('#app')
