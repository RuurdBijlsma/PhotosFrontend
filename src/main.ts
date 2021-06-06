import Vue from 'vue'
import App from './App.vue'
import './registerServiceWorker'
import router from './plugins/router'
import store from './plugins/store'
import vuetify from './plugins/vuetify'

Vue.config.productionTip = false
// @ts-ignore
import PerfectScrollbar from 'vue2-perfect-scrollbar'
import 'vue2-perfect-scrollbar/dist/vue2-perfect-scrollbar.css'
Vue.use(PerfectScrollbar)

new Vue({
    router,
    store,
    vuetify,
    render: h => h(App)
}).$mount('#app')
