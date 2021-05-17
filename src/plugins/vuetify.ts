import Vue from 'vue';
import Vuetify from 'vuetify/lib/framework';

Vue.use(Vuetify);

export default new Vuetify({
    theme: {
        themes: {
            dark: {
                primary: '#5996d1',
            },
            light: {
                primary: '#318bd5',
            }
        }

    }
});
