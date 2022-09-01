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

class HistoryPage {
    constructor() {
        this.t = {};
    }
}

function item_firstTime(item) {
    let result = 9999999999;
    for (const page in item.p)
        result = Math.min(result, item.p[page].firstTime());
    return result;
}

function item_lastTime(item) {
    let result = 0;
    for (const page in item.p)
        result = Math.max(result, item.p[page].lastTime());
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
