const localeStr = require('chrome://chartero/locale/overview.json');
const readingHistory = new HistoryLibrary();
const collections = Zotero.Collections.getByLibrary(readingHistory.lib, true);

function getItemByKey(key) {
    return Zotero.Items.getByLibraryAndKey(readingHistory.lib, key);
}

function getItemHistory(key) {
    return Object.entries(readingHistory.items).find(pair => {
        const it = getItemByKey(pair[0]);
        return it.parentItem ? it.parentItem.key === key : false // 有阅读记录
    })
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

async function drawBubbleChart() {
    const series = new Array();
    for (const k in readingHistory.items) {
        const item = getItemByKey(k);
        if (!item.parentID)
            continue;  // TODO: display?
        let p = Zotero.Collections.getCollectionsContainingItems([item.parentID]);
        const collection = (await p)[0] || {};
        const s = series.find(s => s.name === (collection.name || localeStr.unfiled))
        const data = {
            name: item.getField('title'),
            value: readingHistory.items[k].getTotalSeconds()
        };
        if (s)
            s.data.push(data);
        else
            series.push({
                name: collection.name || localeStr.unfiled,
                data: [data]
            });
    }
    Highcharts.chart('item-chart', {
        chart: {
            type: 'packedbubble'
        },
        title: {
            text: 'Items'
        },
        tooltip: {
            useHTML: true,
            pointFormat: '{point.name}<br/><b>{point.value}</b>s'
        },
        plotOptions: {
            packedbubble: {
                minSize: '20%',
                maxSize: '160%',
                zMin: 0,
                zMax: 1000,
                draggable: true,
                allowPointSelect: true,
                layoutAlgorithm: {
                    splitSeries: false,
                    dragBetweenSeries: true,
                    gravitationalConstant: 0.02
                },
                dataLabels: {
                    enabled: true,
                    format: '{point.name}',
                    filter: {
                        property: 'y',
                        operator: '>',
                        value: 250
                    },
                    style: {
                        color: 'black',
                        textOutline: 'none',
                        fontWeight: 'normal'
                    }
                }
            }
        },
        series
    });
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
        subtitle: { text: 'Click pies for details.' },
        series: [{
            minPointSize: 10,
            innerSize: '20%',
            zMin: 0,
            name: 'collections',
            colorByPoint: true,
            data
        }],
        drilldown: { series }
    }, chart => $('#pie-chart').mouseenter(() =>
        chart.series[0].animate(false)));
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
    const s = {
        type: 'wordcloud',
        name: 'Total Time',
        maxFontSize: 26,
        minFontSize: 8,
        data: data.filter(i => i.weight > 0)
    };
    Highcharts.chart('wordcloud-chart', {
        series: [s],
        title: { text: '标签词云图' }
    }, chart => $('#wordcloud-chart').mouseenter(() => {
        chart.series[0].remove(false);
        chart.addSeries(s);
    }));
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
    const weekS = { name: 'week', data: weekData, type: 'column' },
        hourS = { name: 'hour', data: hourData, type: 'line', xAxis: 1 };
    Highcharts.chart('schedule-chart', {
        title: { text: '作息规律统计' },
        xAxis: [
            { opposite: true, categories: weekCategories, crosshair: true },
            { opposite: false, categories: hourCategories }
        ],
        yAxis: {
            title: { text: 'seconds' }
        },
        tooltip: { valueSuffix: ' s' },
        plotOptions: {
            line: { marker: { enabled: false } }
        },
        series: [weekS, hourS]
    }, chart => $('#schedule-chart').mouseenter(() => {
        chart.series[0].remove(false);
        chart.series[0].remove(false);
        chart.addSeries(weekS);
        chart.addSeries(hourS);
    }));
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

    const s = { name: 'library name', data };
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
        plotOptions: { series: { minPointLength: 5 } },
        series: [s]
    }, chart => $('#gantt-chart').mouseenter(() => {
        chart.series[0].remove(false);
        chart.addSeries(s);
    }));
}

function initCharts() {
    var numCharts = 0;
    Highcharts.setOptions({
        chart: {
            borderRadius: 6,
            style: { fontFamily: '' },
            events: {
                load: function () {
                    if (++numCharts > 4)
                        Zotero.hideZoteroPaneOverlays();
                    Zotero.updateZoteroPaneProgressMeter(numCharts * 20);
                }
            }
        },
        credits: { enabled: false }
    });
    drawGantt();
    drawPieChart();
    drawWordCloud();
    drawBubbleChart();
    drawScheduleChart();
}

window.addEventListener('DOMContentLoaded', (event) => {
    if (event.target.URL.indexOf('index') > 0) {
        const noteKey = Zotero.Prefs.get("chartero.dataKey");
        const noteItem = Zotero.Items.getByLibraryAndKey(1, noteKey);
        try {
            readingHistory.mergeJSON(JSON.parse(noteItem.getNote()));
            initCharts();
        } catch (e) {
            console.log(e);
            Zotero.debug(e);
            Zotero.Chartero.showMessage('不兼容的旧版记录，请前往数据可视化页面清理！');
        }
    } else if (event.target.URL.indexOf('skyline') > 0)
        document.getElementById('skyline-frame').contentWindow.postMessage({
            history: readingHistory
        }, '*');
});
