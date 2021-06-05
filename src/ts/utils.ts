export const months = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
export const shortMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function bytesToReadable(bytes: number) {
    let length = Math.log10(bytes);
    if (length < 3) {
        return bytes + ' B';
    } else if (length < 6) {
        return (bytes / 1024).toFixed(1) + ' kB';
    } else if (length < 9) {
        return (bytes / (1024 ** 2)).toFixed(2) + ' MB';
    } else if (length < 12) {
        return (bytes / (1024 ** 3)).toFixed(2) + ' GB';
    } else if (length < 15) {
        return (bytes / (1024 ** 4)).toFixed(2) + ' TB';
    }
    return 'very bige bytes';
}

export function secondsToHms(seconds: number) {
    if (isNaN(seconds) || seconds === undefined)
        return '0:00';

    seconds = Math.round(seconds);
    let h = Math.floor(seconds / 3600);
    let m = Math.floor((seconds % 3600) / 60);
    let s = seconds % 60;
    let hs = h.toString();
    let ms = m.toString();
    let ss = s.toString();
    if (hs !== '0') {
        ms = ms.padStart(2, '0');
        ss = ss.padStart(2, '0');
    }
    ss = ss.padStart(2, '0');

    if (hs === '0')
        return `${ms}:${ss}`;
    else return `${hs}:${ms}:${ss}`;
}