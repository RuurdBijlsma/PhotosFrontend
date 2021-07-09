import Vue from 'vue';
import Vuetify from 'vuetify/lib/framework';

Vue.use(Vuetify);

let dark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
if (localStorage.getItem('darkTheme') !== null)
    dark = localStorage.darkTheme === 'true';

export default new Vuetify({
    breakpoint:{
        mobileBreakpoint: 'sm'
    },
    theme: {
        dark,
        themes: {
            dark: {
                primary: '#5996d1',
                secondary: '#c95313',
                selectionColor: '#252b32',
            },
            light: {
                primary: '#318bd5',
                secondary: '#d05524',
                selectionColor: '#dae5f3',
            }
        }
    }
});
