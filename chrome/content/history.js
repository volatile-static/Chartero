function ms2s(ms) {  // convert milliseconds to seconds
    return parseInt(ms / 1000);
}

function s2hour(s) {
    return {
        second: s % 60,
        minute: parseInt(s / 60) % 60,
        hour: parseInt(s / 3600)
    }
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
    
    getDayTime(day) {
        let result = 0;
        for (const i in this.t)
            if (day == new Date(i * 1000).getDay())
                result += this.t[i];
        return result;
    }
    
    getHourTime(hour) {
        let result = 0;
        for (const i in this.t)
            if (hour == new Date(i * 1000).getHours())
                result += this.t[i];
        return result;
    }
}

class HistoryItem {
    constructor(total = 0) {
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
        } else throw 'Item parse failed!';
    }

    // 找到第一次阅读的时间（秒）
    firstTime() {
        let result = 9999999999;
        for (const page in this.p)
            result = Math.min(result, this.p[page].firstTime());
        return result;
    }

    // 找到最后一次阅读的时间（秒）
    lastTime() {
        let result = 0;
        for (const page in this.p)
            result = Math.max(result, this.p[page].lastTime());
        return result;
    }

    // 计算这一天阅读的时间（秒）
    getDateTime(time) {
        let result = 0;
        for (const page in this.p)
            result += this.p[page].getDateTime(new Date(time));
        return result;
    }
    
    // 计算周几读了多久(0~6)
    getDayTime(day) {
        let result = 0;
        for (const page in this.p)
            result += this.p[page].getDayTime(day);
        return result;
    }
    
    // 计算这个小时读了多久(0~23)
    getHourTime(hour) {
        let result = 0;
        for (const page in this.p)
            result += this.p[page].getHourTime(hour);
        return result;
    }

    // 一共读了多少秒
    getTotalSeconds() {
        let result = 0;
        for (const page in this.p)
            result += this.p[page].getTotalSeconds();
        return result;
    }

    // 一共读了多少页
    getRead() {
        return Object.keys(this.p).length;
    }

    // 计算阅读进度百分比
    getProgress(k = 1, d = 2) {
        const p = k * this.getRead() / this.n;
        return Number(p.toFixed(d));
    }
}

class HistoryLibrary {
    constructor(id = 1) {
        this.lib = id;
        this.items = {};
    }
    
    mergeJSON(json) {
        if (!json.lib)
            throw 'No library ID!';
        this.lib = json.lib;
        for (const k in json.items) {
            if (!this.items[k])
                this.items[k] = new HistoryItem(0);
            this.items[k].mergeJSON(json.items[k]);
        }
    }

    firstTime() {
        let result = 9999999999;
        for (const it in this.items)
            result = Math.min(result, this.items[it].firstTime());
        return result;
    }

    lastTime() {
        let result = 0;
        for (const it in this.items)
            result = Math.max(result, this.items[it].lastTime());
        return result;
    }

    getDateTime(time) {
        let result = 0;
        for (const it in this.items)
            result += this.items[it].getDateTime(new Date(time));
        return result;
    }
}
