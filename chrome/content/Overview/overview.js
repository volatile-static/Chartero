const localeStr = require('chrome://chartero/locale/overview.json');
const readingHistory = new HistoryLibrary();
const collections = Zotero.Collections.getByLibrary(readingHistory.lib, true);

function getItemByKey(key) {
    return Zotero.Items.getByLibraryAndKey(readingHistory.lib, key);
}

function getItemHistory(key) {
    return Object.entries(readingHistory.items).find(pair =>
        getItemByKey(pair[0]).parentItem.key === key  // 有阅读记录
    )
}

function getTimeByKey(key) {
    const his = getItemHistory(key);
    return his ? his[1].getTotalSeconds() : 0;  // 总阅读时长
}

function forEachItem(fun) {
    for (const collection of collections)
        for (const item of collection.getChildItems())
            fun(item);
}

function drawPieChart() {
    const data = new Array(), series = new Array();
    for (const collection of collections) {
        const items = collection.getChildItems();
        data.push({
            name: collection.name,
            drilldown: collection.name,
            y: items.length,  // 条目数作为扇形角度
            z: items.reduce((sum, item) =>
                sum + getTimeByKey(item.key), 0)  // 从0开始加
        });
        series.push({
            name: collection.name,
            id: collection.name,
            type: data[data.length - 1].z > 0 ? 'variablepie' : 'pie',
            data: items.reduce((arr, item) => {
                const tags = item.getTags().map(t => t.tag);  // 标签字符串的数组
                const time = getTimeByKey(item.key);
                for (const tag of tags) {
                    const fan = arr.find(i => i[0] === tag);  // 0代表名字
                    if (fan) {  // 该标签已记录
                        ++fan[1];  // 1代表弧度
                        fan[2] += time;  // 2代表厚度
                    }
                    else
                        arr.push(new Array(tag, 1, time));
                }
                return arr;
            }, [])
        });
    }
    Highcharts.chart('pie-chart', {
        chart: { type: 'variablepie' },
        title: { text: '总阅读时长占比' },
        series: [{
            minPointSize: 10,
            innerSize: '20%',
            zMin: 0,
            name: 'collections',
            colorByPoint: true,
            data
        }],
        drilldown: { series }
    });
}

function drawWordCloud() {
    const data = new Array();
    forEachItem(item => {
        for (tag of item.getTags()) {
            const obj = data.find(i => i.name === tag.tag);
            const tim = getTimeByKey(item.key);
            if (obj)
                obj.weight += tim;
            else
                data.push({
                    name: tag.tag,
                    weight: tim
                })
        }
    });
    Highcharts.chart('wordcloud-chart', {
        series: [{
            type: 'wordcloud',
            name: 'Total Time',
            maxFontSize: 26,
            minFontSize: 8,
            data: data.filter(i => i.weight > 0)
        }],
        title: { text: '标签词云图' }
    });
}

function drawScheduleChart() {
    const hourData = new Array(24), hourCategories = new Array();
    const weekData = new Array(7),
        weekCategories = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    for (let i = 0; i < 23; ++i)
        hourCategories.push(i);

    forEachItem(item => {
        let his = getItemHistory(item.key);
        if (his)
            his = his[1];
        else
            return;
        for (let i = 0; i < 24; ++i)
            hourData[i] = his.getHourTime(i) + (hourData[i] || 0);
        for (let i = 0; i < 7; ++i)
            weekData[i] = his.getDayTime(i) + (weekData[i] || 0);
    });
    Highcharts.chart('schedule-chart', {
        title: { text: '作息规律统计' },
        xAxis: [
            { opposite: true, categories: weekCategories, crosshair: true },
            { opposite: false, categories: hourCategories }
        ],
        yAxis: {
            title: { text: 'seconds' }
        },
        series: [
            { name: 'week', data: weekData, type: 'column' },
            { name: 'hour', data: hourData, type: 'line', xAxis: 1 }
        ]
    });
}

function drawGantt() {
    const data = new Array();
    for (k in readingHistory.items)
        data.push({
            name: getItemByKey(k).getField('title'),  // 
            start: readingHistory.items[k].firstTime() * 1000,
            end: readingHistory.items[k].lastTime() * 1000,
            completed: readingHistory.items[k].getProgress()
        });
    Highcharts.ganttChart('gantt-chart', {
        title: { text: '时间线' },
        navigator: {
            enabled: true,
            liveRedraw: true,
            yAxis: {
                min: 0,
                max: Object.keys(readingHistory.items).length
            }
        },
        yAxis: { labels: { overflow: 'allow' } },
        rangeSelector: {
            enabled: true,
            selected: 0
        },
        series: [{
            name: 'library name',
            data
        }]
    });
}

function initCharts() {
    Highcharts.setOptions({
        chart: {
            borderRadius: 6,
            style: { fontFamily: '' }
        },
        credits: { enabled: false }
    });
    drawGantt();
    drawPieChart();
    drawWordCloud();
    drawScheduleChart();
}

window.addEventListener('DOMContentLoaded', (event) => {
    if (event.target.URL.indexOf('index') > 0) {
        const noteKey = Zotero.Prefs.get("chartero.dataKey");
        const noteItem = Zotero.Items.getByLibraryAndKey(1, noteKey);
        readingHistory.mergeJSON(JSON.parse(noteItem.getNote()));
        initCharts();
    } else if (event.target.URL.indexOf('skyline') > 0) {
        document.getElementById('skyline-frame').contentWindow.postMessage({
            history: readingHistory
        }, '*');
    }
});
