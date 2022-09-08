function ms2s(ms) {  // convert milliseconds to seconds
    return parseInt(ms / 1000);
}

function page_firstTime(page) {
    let result = 9999999999;
    for (const tt in page.t)
        result = Math.min(result, tt);
    return result;
}

function page_lastTime(page) {
    let result = 0;
    for (const tt in page.t)
        result = Math.max(result, tt);
    return result;
}

function page_getTotalSeconds(page) {
    let result = 0;
    for (const i in page.t)
        result += page.t[i];
    return result;
}

function page_getDateTime(page, date) {
    let result = 0;
    for (const i in page.t)
        if (date.toDateString() == (new Date(i*1000)).toDateString())
            result += page.t[i];
    return result;
}

class HistoryPage {
    constructor() {
        this.t = {};
    }
}

function item_firstTime(item) {
    let result = 9999999999;
    for (const page in item.p)
        result = Math.min(result, page_firstTime(item.p[page]));
    return result;
}

function item_lastTime(item) {
    let result = 0;
    for (const page in item.p)
        result = Math.max(result, page_lastTime(item.p[page]));
    return result;
}

function item_getDateTime(item, time) {  // ms
    let result = 0;
    for (const page in item.p)
        result += page_getDateTime(item.p[page], new Date(time));
    return result;
}

class HistoryItem {
    constructor(total) {
        this.n = total;
        this.p = {};
    }
}

class HistoryLibrary {
    constructor(id) {
        this.lib = id;
        this.items = {};
    }
}
