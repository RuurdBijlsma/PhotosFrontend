import Vue from 'vue';
import Vuetify from 'vuetify/lib/framework';

Vue.use(Vuetify);

let dark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
if (localStorage.getItem('darkTheme') !== null)
    dark = localStorage.darkTheme === 'true';

export default new Vuetify({
    theme: {
        dark,
        themes: {
            dark: {
                primary: '#5996d1',
                secondary: '#c95313',
            },
            light: {
                primary: '#318bd5',
                secondary: '#c1792e',
            }
        }
    }
});
