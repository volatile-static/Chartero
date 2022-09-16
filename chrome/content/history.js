function ms2s(ms) {  // convert milliseconds to seconds
    return parseInt(ms / 1000);
}

class HistoryPage {
    constructor() {
        this.t = {};
    }

    firstTime() {
        let result = 9999999999;
        for (const tt in this.t)
            result = Math.min(result, tt);
        return result;
    }

    lastTime() {
        let result = 0;
        for (const tt in this.t)
            result = Math.max(result, tt);
        return result;
    }

    getTotalSeconds() {
        let result = 0;
        for (const i in this.t)
            result += this.t[i];
        return result;
    }

    getDateTime(date) {
        let result = 0;
        for (const i in this.t)
            if (date.toDateString() == new Date(i * 1000).toDateString())
                result += this.t[i];
        return result;
    }
}

class HistoryItem {
    constructor(total) {
        this.n = total;
        this.p = {};
    }

    mergeJSON(json) {
        if (json.n && json.p) {
            this.n = json.n;
            for (const i in json.p) {
                if (!this.p[i])
                    this.p[i] = new HistoryPage();
                Object.assign(this.p[i].t, json.p[i].t);
            }
        }
    }

    firstTime() {
        let result = 9999999999;
        for (const page in this.p)
            result = Math.min(result, this.p[page].firstTime());
        return result;
    }

    lastTime() {
        let result = 0;
        for (const page in this.p)
            result = Math.max(result, item.p[page].lastTime());
        return result;
    }

    getDateTime(time) {
        let result = 0;
        for (const page in this.p)
            result += this.p[page].getDateTime(new Date(time));
        return result;
    }

    getTotalSeconds() {
        let result = 0;
        for (const page in this.p)
            result += this.p[page].getTotalSeconds();
        return result;
    }
}

class HistoryLibrary {
    constructor(id) {
        this.lib = id;
        this.items = {};
    }
    mergeJSON(json) {
        if (!json.lib)
            return;
        this.lib = json.lib;
        for (const i in json.items) {
            if (!this.items[i])
                this.items[i] = new HistoryItem(0);
            this.items[i].mergeJSON(json.items[i]);
        }
    }
}
