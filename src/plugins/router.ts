import Vue from 'vue'
import VueRouter, {RouteConfig} from 'vue-router'
import Home from '../views/Home.vue'
import historyMode from "@/env/historyMode";

Vue.use(VueRouter)

const routes: Array<RouteConfig> = [
    {
        path: '/',
        name: 'Home',
        component: Home,
        meta: {title: 'Photos - Ruurd Photos'},
        children: [{
            meta: {title: 'Photo - Ruurd Photos'},
            path: '/photo/:id',
            name: 'HomePhoto',
            component: () => import('../views/Photo.vue'),
            children: [{
                meta: {title: 'Edit photo - Ruurd Photos'},
                path: '/photo/:id/edit',
                name: 'EditHomePhoto',
                component: () => import('../views/EditPhoto.vue'),
            }],
        }],
    },
    {
        path: '/search/:query',
        name: 'Search',
        meta: {title: ':query - Ruurd Photos'},
        component: () => import('../views/Search.vue'),
        children: [{
            meta: {title: 'Photo - Ruurd Photos'},
            path: '/search/:query/photo/:id',
            name: 'SearchPhoto',
            component: () => import('../views/Photo.vue'),
            children: [{
                meta: {title: 'Edit photo - Ruurd Photos'},
                path: '/search/:query/photo/:id/edit',
                name: 'EditSearchPhoto',
                component: () => import('../views/EditPhoto.vue'),
            }],
        }],
    },
    {
        path: '/explore',
        name: 'Explore',
        meta: {title: 'Explore - Ruurd Photos'},
        component: () => import('../views/Explore.vue')
    },
    {
        path: '/map',
        name: 'Map',
        meta: {title: 'Map - Ruurd Photos'},
        component: () => import('../views/Map.vue')
    },
    {
        path: '/settings',
        name: 'Settings',
        meta: {title: 'Settings - Ruurd Photos'},
        component: () => import('../views/settings/Settings.vue'),
        children: [
            {
                meta: {title: 'Settings - Ruurd Photos'},
                path: '/settings',
                name: 'GeneralSettings',
                component: () => import('../views/settings/GeneralSettings.vue')
            },
            {
                meta: {title: 'Map settings - Ruurd Photos'},
                path: '/settings/map',
                name: 'MapSettings',
                component: () => import('../views/settings/MapSettings.vue')
            },
            {
                meta: {title: 'Import - Ruurd Photos'},
                path: '/settings/import',
                name: 'ImportSettings',
                component: () => import('../views/settings/ImportSettings.vue')
            },
        ],
    },
    {
        path: '/trash',
        name: 'Trash',
        meta: {title: 'Trash - Ruurd Photos'},
        component: () => import('../views/Trash.vue')
    },
    {
        path: '/upload',
        name: 'Upload',
        meta: {title: 'Upload results - Ruurd Photos'},
        component: () => import('../views/UploadResult.vue')
    },
    {
        path: '/logs',
        name: 'Logs',
        meta: {title: 'Logs - Ruurd Photos'},
        component: () => import('../views/Logs.vue')
    },
    {
        path: '/login',
        name: 'Login',
        meta: {
            title: 'Login - Ruurd Photos',
            requiresAuth: false,
        },
        component: () => import('../views/Login.vue')
    },
    {
        path: '/albums',
        name: 'Albums',
        meta: {title: 'Albums - Ruurd Photos'},
        component: () => import('../views/Albums.vue')
    },
    {
        path: '/album/:albumId',
        name: 'Album',
        meta: {
            title: 'Album - Ruurd Photos',
            requiresAuth: false,
        },
        component: () => import('../views/Album.vue'),
        children: [{
            meta: {
                title: 'Photo - Ruurd Photos',
                requiresAuth: false,
            },
            path: '/album/:albumId/photo/:id',
            name: 'AlbumPhoto',
            component: () => import('../views/Photo.vue'),
            children: [{
                meta: {
                    title: 'Edit photo - Ruurd Photos',
                },
                path: '/album/:albumId/photo/:id/edit',
                name: 'EditAlbumPhoto',
                component: () => import('../views/EditPhoto.vue'),
            }],
        }],
    },
]

const router = new VueRouter({
    mode: historyMode ? 'history' : 'hash',
    routes,
})

router.beforeEach((to, from, next) => {
    // This goes through the matched routes from last to first, finding the closest route with a title.
    // e.g., if we have `/some/deep/nested/route` and `/some`, `/deep`, and `/nested` have titles,
    // `/nested`'s will be chosen.
    const nearestWithTitle = to.matched.slice().reverse().find(r => r.meta && r.meta.title);
    const previousNearestWithMeta = from.matched.slice().reverse().find(r => r.meta && r.meta.metaTags);

    // If a route with a title was found, set the document (page) title to that value.
    let title = null;
    if (nearestWithTitle) {
        title = nearestWithTitle.meta.title;
    } else if (previousNearestWithMeta) {
        title = previousNearestWithMeta.meta.title;
    }
    if (title !== null) {
        let parts = title.split(' ');
        for (let i = 0; i < parts.length; i++)
            if (parts[i].startsWith(':')) {
                let param = parts[i].substr(1);
                if (param.length > 0 && to.params.hasOwnProperty(param))
                    parts[i] = to.params[param];
            }
        document.title = parts.join(' ');
    }

    // Remove any stale meta tags from the document using the key attribute we set below.
    Array.from(document.querySelectorAll('[data-vue-router-controlled]')).map(el => el.parentNode?.removeChild(el));
    next();
});

export default router
