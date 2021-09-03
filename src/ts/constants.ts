import {getScrollbarWidth} from "@/ts/utils";

let apiOverride = null;
if (location.search.includes('api=')) {
    apiOverride = decodeURIComponent(location.search.split('api=')[1].split('&')[0]);
}
export const defaultApi = location.origin + '/api';
export const api =
    apiOverride ??
    (localStorage.getItem('api') === null ?
        defaultApi :
        localStorage.api);
console.log({api});

export const months = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
export const shortMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const subTypes = ['portrait', 'vr', 'slomo', 'animation'];

export const scrollBarWidth = getScrollbarWidth();
