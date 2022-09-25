const readingHistory = new HistoryLibrary();

function init() {
    const data = new Array();
    
    for (const k in readingHistory.items)
        console.log(readingHistory.items[k].getProgress());
    
    for (k in readingHistory.items)
        data.push({
            name: Zotero.Items.getByLibraryAndKey(1, k).getField('title'),  // 
            start: readingHistory.items[k].firstTime() * 1000,
            end: readingHistory.items[k].lastTime() * 1000,
            completed: readingHistory.items[k].getProgress()
        });
    Highcharts.ganttChart('gantt-chart', {
        title: {
            text: '时间线'
        },
        chart: {
            style: {
                fontFamily: ""
            }
        },

        navigator: {
            enabled: true,
            liveRedraw: true,
            yAxis: {
                min: 0,
                max: Object.keys(readingHistory.items).length
            }
        },

        rangeSelector: {
            enabled: true,
            selected: 0
        },

        xAxis: {
            min: readingHistory.firstTime() * 1000,
            max: readingHistory.lastTime() * 1000
        },
        series: [{
            name: 'library name',
            data: data
        }]
    });
}

function handler(event) {
    if (!event.data || !event.data)
        return;
    readingHistory.mergeJSON(event.data.history);
    init();
}

window.addEventListener('DOMContentLoaded', () => {
    window.addEventListener('message', handler, false);
});
