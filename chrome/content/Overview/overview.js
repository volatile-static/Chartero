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

async function drawNetwork() {
    const data = new Array(),
        colors = Highcharts.getOptions().colors,
        allItems = await Zotero.Items.getAll(readingHistory.lib, true),
        items = allItems.filter(it => it.relatedItems.length > 0),
        topItems = allItems.filter(it => it.isRegularItem()),
        tags = topItems.map(i => i.getTags().map(t => t.tag)),
        nodes1 = new Object(),
        data1 = new Array();
    for (it of items)
        for (r of it.relatedItems)
            data.push([it.key, r]);

    for (let i = 0; i < topItems.length; ++i)
        if (tags[i].length > 0)
            for (let j = 0; j < i; ++j) {
                const intersection = tags[i].filter(t => tags[j].includes(t));
                if (intersection.length > 0) {
                    data1.push({
                        from: i,
                        to: j,
                        width: Math.min(intersection.length * 2, 9)
                    });
                    nodes1[i] = nodes1[j] = true;
                }
            }
    Highcharts.chart('item-chart', {
        title: { text: '条目关系网' },
        plotOptions: {
            networkgraph: {
                layoutAlgorithm: {
                    enableSimulation: true
                }
            }
        },
        chart: { type: 'networkgraph' },
        series: [{
            name: '关联文献',
            showInLegend: true,
            point: {
                events: {
                    click: function (event) {
                        if (event.ctrlKey)
                            Zotero.Chartero.viewItemInLib(getItemByKey(this.id).id);
                    }
                }
            },
            nodes: items.map(it => {
                return {
                    id: it.key,
                    marker: {
                        symbol: 'circle',
                        radius: Math.min(Math.max(Math.sqrt(getTimeByKey(it.key)), 5), 60)
                    },
                    name: it.getField('title')
                }
            }),
            data
        }, {
            name: '共同标签',
            showInLegend: true,
            data: data1,
            nodes: Object.keys(nodes1).map(i => {
                return {
                    id: parseInt(i),
                    marker: {
                        symbol: 'circle',
                        radius: Math.max(Math.sqrt(getTimeByKey(topItems[i].key)), 5)
                    },
                    color: colors[i % colors.length],
                    name: topItems[i].getField('title')
                };
            })
        }]
    });
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
        chart: { type: 'packedbubble' },
        title: { text: localeStr.itemChartTitle },
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
                // allowPointSelect: true,
                layoutAlgorithm: {
                    // splitSeries: false,
                    gravitationalConstant: 0.02
                },
                // dataLabels: {
                // enabled: true,
                // // format: '{point.name}',
                // formatter: function () {
                //     console.log(this.key, this.radius);
                //     alert(1);
                //     return this.point.radius * 2 < this.key.length ? '' : point.name;
                // },
                // inside: true,
                // shadow: true
                // filter: {
                //     property: 'y',
                //     operator: '>',
                //     value: 250
                // },
                // style: {
                //     color: 'black',
                //     textOutline: 'none',
                //     fontWeight: 'normal'
                // }
                // }
            }
        },
        series
    });
}

async function drawPieChart() {
    const data = new Array(), series = new Array();
    function process(arr, item) {  // 将item的数组转换为饼图数据
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
    }
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
            data: items.reduce(process, [])
        });
    }

    // 添加未分类条目
    let items = await Zotero.Items.getAll(readingHistory.lib, true);
    items = items.filter(it =>
        it.isRegularItem() && it.getCollections().length === 0
    );
    const tottim = items.reduce((sum, item) => sum + getTimeByKey(item.key), 0);
    data.push({
        name: localeStr.unfiled,
        drilldown: 'unfiled',
        y: items.length,
        z: tottim
    });
    series.push({
        name: localeStr.unfiled,
        id: 'unfiled',
        type: tottim > 0 ? 'variablepie' : 'pie',
        data: items.reduce(process, [])
    })
    for (const s of series) {
        const others = [
            'others',
            s.data.reduce((prev, curr) =>
                prev += (curr[1] == 1 && curr[2] == 0), 0
            ),  // 只出现一次且没读过的标签个数
            0
        ];
        s.data = s.data.filter(i => i[1] != 1 || i[2] != 0);
        if (others[1] > 0)
            s.data.push(others);
    }
    Highcharts.chart('pie-chart', {
        chart: {
            type: 'variablepie',
            animation: { easing: undefined }
        },
        title: { text: '总阅读时长占比' },
        subtitle: { text: 'Click pies for details.' },
        plotOptions: {
            pie: { allowPointSelect: true },
            variablepie: { allowPointSelect: true }
        },
        series: [{
            cursor: 'pointer',
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

async function drawWordCloud() {
    const data = new Array();
    // forEachItem(item => {
    //     for (tag of item.getTags()) {
    //         const obj = data.find(i => i.name === tag.tag);
    //         const tim = getTimeByKey(item.key);
    //         if (obj)
    //             obj.weight += tim;
    //         else
    //             data.push({
    //                 name: tag.tag,
    //                 weight: tim
    //             })
    //     }
    // });
    const getData = text => text.reduce((dat, txt) => {
        if (!txt)
            return dat;
        txt.split(/[^a-z]/g).filter(w => w.length > 3).forEach(word => {
            const obj = dat.find(i => i.name === word);
            if (obj)
                ++obj.weight;
            else
                dat.push({
                    name: word,
                    weight: 1
                })
        });
        return dat;
    }, []).sort((a, b) => b.weight - a.weight).slice(0, 60),
        allItems = await Zotero.Items.getAll(readingHistory.lib),
        allAnnotations = allItems.filter(it => it.isAnnotation()),
        allAnnotationText = allAnnotations.map(a => a.annotationText),
        allTops = allItems.filter(it => it.isRegularItem()),
        allTitles = allTops.map(it => it.getField('title')),
        s0 = {
            type: 'wordcloud',
            name: 'Total Time',
            showInLegend: true,
            maxFontSize: 26,
            minFontSize: 8,
            data: data.filter(i => i.weight > 0)
        }, s1 = {
            type: 'wordcloud',
            name: 'Annotation',
            showInLegend: true,
            visible: false,
            maxFontSize: 26,
            minFontSize: 8,
            data: getData(allAnnotationText)
        }, s2 = {
            type: 'wordcloud',
            name: 'Title',
            showInLegend: true,
            // visible: false,
            maxFontSize: 26,
            minFontSize: 8,
            data: getData(allTitles)
        };
    Highcharts.chart('wordcloud-chart', {
        series: [s2, s1],
        title: { text: '标题词云图' }
    }, chart => {
        $('#wordcloud-chart').mouseenter(() => {
            chart.series[1].remove(false);
            chart.series[0].remove(false);
            chart.addSeries(s2);
            chart.addSeries(s1);
        });
        Highcharts.addEvent(
            Highcharts.seriesTypes.wordcloud,
            'legendItemClick',
            function (e) {
                chart.series[chart.series[1] == e.target ? 0 : 1].setVisible();
            }
        );
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
            line: { marker: { enabled: false } },
            column: { borderRadius: 2 }
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
            name: (getItemByKey(k).parentItem || getItemByKey(k)).getField('title'),  // 
            start: readingHistory.items[k].firstTime() * 1000,
            end: readingHistory.items[k].lastTime() * 1000,
            completed: readingHistory.items[k].getProgress()
        });

    const s = { name: Zotero.Libraries._cache[readingHistory.lib].name, data };
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
            buttons: [{
                type: 'month',
                count: 1,
                text: localeStr['month'],
                title: 'View 1 month'
            }, {
                type: 'week',
                count: 1,
                text: localeStr['week'],
                title: 'View 1 week'
            }, {
                type: 'year',
                count: 1,
                text: localeStr['year'],
                title: 'View 1 year'
            }],
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
    if (Zotero.locale == 'zh-CN') {  // 添加汉化代码
        const chinese = document.createElement('script');
        chinese.src = 'chrome://chartero/content/highcharts/zh_CN.js';
        document.head.appendChild(chinese);
    }
    var numCharts = 0;
    Highcharts.setOptions({
        time: {
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            useUTC: false
        },
        chart: {
            borderRadius: 6,
            animation: {
                duration: 1500,
                easing: pos => {
                    if ((pos) < (1 / 2.75))
                        return (7.5625 * pos * pos);
                    if (pos < (2 / 2.75))
                        return (7.5625 * (pos -= (1.5 / 2.75)) * pos + 0.75);
                    if (pos < (2.5 / 2.75))
                        return (7.5625 * (pos -= (2.25 / 2.75)) * pos + 0.9375);
                    return (7.5625 * (pos -= (2.625 / 2.75)) * pos + 0.984375);
                }
            },
            style: { fontFamily: '' }
        },
        plotOptions: {
            series: {
                events: {
                    afterAnimate: function () {
                        if (numCharts > 2)
                            return;
                        else if (++numCharts == 2)  // 添加图表记得改！
                            Zotero.hideZoteroPaneOverlays();
                        // else
                        //     Zotero.updateZoteroPaneProgressMeter(numCharts * 20);
                    }
                },
                shadow: true
            }
        },
        exporting: {
            menuItemDefinitions: {
                downloadSVG: {
                    onclick: function () {
                        Zotero.Chartero.saveSVG(this.getSVGForExport());
                    }
                }
            },
            buttons: {
                contextButton: {
                    menuItems: ['viewFullscreen', 'printChart', 'downloadSVG']
                }
            }
        },
        credits: { enabled: false }
    });
    drawScheduleChart();
    drawBubbleChart();
    drawWordCloud();
    drawPieChart();
    drawGantt();
    // drawNetwork();
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
            Zotero.hideZoteroPaneOverlays();
            Zotero.Chartero.showMessage('不兼容的记录格式，请前往数据可视化页面清理！');
            Zotero.Chartero.viewDataTree();
        }
    } else if (event.target.URL.indexOf('skyline') > 0)
        document.getElementById('skyline-frame').contentWindow.postMessage({
            history: readingHistory
        }, '*');
});
