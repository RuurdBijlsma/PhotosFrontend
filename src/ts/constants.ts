import {getScrollbarWidth} from "@/ts/utils";

const testRuurdDev = true;

export const api = process.env.NODE_ENV === 'development' && !testRuurdDev
    ? 'http://localhost:3000'
    : 'https://api.ruurd.dev'

export const months = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
export const shortMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const scrollBarWidth = getScrollbarWidth();
