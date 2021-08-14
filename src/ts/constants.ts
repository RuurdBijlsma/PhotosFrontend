import {getScrollbarWidth} from "@/ts/utils";

export const api =
    localStorage.getItem('api') === null ?
        (process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : 'https://api.ruurd.dev') :
        localStorage.api;

export const months = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
export const shortMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const subTypes = ['portrait', 'vr', 'slomo', 'animation'];

export const scrollBarWidth = getScrollbarWidth();
