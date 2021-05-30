import Vue from 'vue'
import VueRouter, {RouteConfig} from 'vue-router'
import Home from '../views/Home.vue'

Vue.use(VueRouter)

const routes: Array<RouteConfig> = [
    {
        path: '/',
        name: 'Home',
        component: Home,
        children: [{
            path: '/photo/:id',
            name: 'HomePhoto',
            component: () => import('../views/Photo.vue')
        }],
    },
    {
        path: '/search/:query',
        name: 'Search',
        component: () => import('../views/Search.vue'),
        children: [{
            path: '/search/:query/photo/:id',
            name: 'SearchPhoto',
            component: () => import('../views/Photo.vue')
        }],
    },
    {
        path: '/login',
        name: 'Login',
        component: () => import('../views/Login.vue')
    },
]

const router = new VueRouter({
    routes
})

export default router
