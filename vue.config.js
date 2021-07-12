const publicPath = require('./src/env/publicPath.js');

console.warn("PUBLIC PATH IS")
console.warn("==========================================================================")
console.warn(publicPath)
console.warn("==========================================================================")

module.exports = {
    transpileDependencies: [
        'vuetify'
    ],
    publicPath,
    pwa: {
        name: 'Photos',
        themeColor: '#5996d1',
        msTileColor: "#1b1845",
        manifestOptions: {
            "short_name": "Photos",
            "name": "Ruurd Photos",
            "lang": "en",
            "description": "Browse your photo and video library.",
            "start_url": "./",
            "background_color": "#1b1845",
            "theme_color": "#5996d1",
            "dir": "ltr",
            "display": "standalone",
            "orientation": "any",
            "icons": [
                {
                    "src": "img/icons/android-chrome-maskable-192x192.png",
                    "type": "image/png",
                    "sizes": "192x192",
                    "purpose": "any maskable",
                },
                {
                    "src": "img/icons/apple-touch-icon-180x180.png",
                    "type": "image/png",
                    "sizes": "180x180",
                    "purpose": "any maskable",
                },
                {
                    "src": "img/icons/apple-touch-icon-152x152.png",
                    "type": "image/png",
                    "sizes": "152x152",
                    "purpose": "any maskable",
                },
                {
                    "src": "img/icons/msapplication-icon-144x144.png",
                    "type": "image/png",
                    "sizes": "144x144",
                    "purpose": "any maskable",
                },
                {
                    "src": "img/icons/apple-touch-icon-120x120.png",
                    "type": "image/png",
                    "sizes": "120x120",
                    "purpose": "any maskable",
                },
                {
                    "src": "img/icons/114-icon.png.png",
                    "type": "image/png",
                    "sizes": "114x114",
                    "purpose": "any maskable",
                },
                {
                    "src": "img/icons/maskable_icon_x96.png",
                    "type": "image/png",
                    "sizes": "96x96",
                    "purpose": "any maskable",
                },
                {
                    "src": "img/icons/76-icon.png.png",
                    "type": "image/png",
                    "sizes": "76x76",
                    "purpose": "any maskable",
                },
                {
                    "src": "img/icons/72-icon.png.png",
                    "type": "image/png",
                    "sizes": "72x72",
                    "purpose": "any maskable",
                },
                {
                    "src": "img/icons/60-icon.png.png",
                    "type": "image/png",
                    "sizes": "60x60",
                    "purpose": "any maskable",
                },
                {
                    "src": "img/icons/57-icon.png.png",
                    "type": "image/png",
                    "sizes": "57x57",
                    "purpose": "any maskable",
                },
                {
                    "src": "img/icons/favicon-32x32.png",
                    "type": "image/png",
                    "sizes": "32x32",
                    "purpose": "any",
                },
                {
                    "src": "img/icons/favicon-16x16.png",
                    "type": "image/png",
                    "sizes": "16x16",
                    "purpose": "any",
                }
            ],
            "prefer_related_applications": false,
        },
    },
}
