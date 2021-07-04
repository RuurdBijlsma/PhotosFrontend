export function isTouchDevice() {
    return (('ontouchstart' in window) ||
        (navigator.maxTouchPoints > 0) ||
        (navigator.msMaxTouchPoints > 0));
}

export function getScrollbarWidth() {
    // Creating invisible container
    const outer: any = document.createElement('div');
    outer.style.visibility = 'hidden';
    outer.style.overflow = 'scroll'; // forcing scrollbar to appear
    outer.style.msOverflowStyle = 'scrollbar'; // needed for WinJS apps
    document.body.appendChild(outer);

    // Creating inner element and placing it in the container
    const inner = document.createElement('div');
    outer.appendChild(inner);

    // Calculating difference between container's full width and the child width
    const scrollbarWidth = (outer.offsetWidth - inner.offsetWidth);

    // Removing temporary elements from the DOM
    outer.parentNode.removeChild(outer);

    return scrollbarWidth;
}

export function filenameToDate(filename: string) {
    let match = filename.match(/(^|[^0-9])(\d\d\d\d)-(\d\d)-(\d\d)[^0-9]/);
    if (match) {
        // format is 2015-01-25
        let [, , year, month, day] = match;
        return new Date(`${year}-${month}-${day} 15:00:00`);
    }

    match = filename.match(/(^|[^0-9])([21]\d\d\d)(\d\d)(\d\d)[^0-9](\d\d)(\d\d)(\d\d)/);
    if (match) {
        // format is 20150125_193531 possibly with ms after that
        let [, , year, month, day, hour, minute, second] = match;
        return new Date(`${year}-${month}-${day} ${hour}:${minute}:${second}`);
    }

    match = filename.match(/(^|[^0-9])([21]\d\d\d)(\d\d)(\d\d)[^0-9]/);
    if (match) {
        // format is 20150125
        let [, , year, month, day] = match;
        return new Date(`${year}-${month}-${day} 15:00:00`);
    }

    return null;
}

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
