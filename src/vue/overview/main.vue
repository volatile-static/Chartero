<script lang="ts">
import Skyline from './components/skyline.vue';
import HistoryAnalyzer from '$/history/analyzer';
import { toTimeString } from '$/utils';
import { Dashboards } from '@/highcharts';
import type {
    SeriesVariablepieOptions,
    SeriesColumnOptions,
    SeriesSplineOptions,
    PointOptionsObject,
    SeriesPieOptions
} from 'highcharts';

const libraryHistory = addon.history.getInLibrary(),
    analyzer = new HistoryAnalyzer(libraryHistory),
    Zotero = addon.getGlobal('Zotero');

function drawSchedule() {
    const weekData = new Array(7).fill(0),
        hourData = new Array(24).fill(0);
    analyzer.forEachPeriod(
        (date, time) => {
            weekData[date.getDay()] += time;
            hourData[date.getHours()] += time;
        }
    );
    return [
        {
            name: addon.locale.scheduleWeek ?? 'week',
            type: 'column',
            data: weekData
        } as SeriesColumnOptions,
        {
            name: addon.locale.scheduleHour ?? 'hour',
            type: 'spline',
            data: hourData,
            xAxis: 1
        } as SeriesSplineOptions
    ];
}

async function drawVariablePie() {
    const data = new Array<PointOptionsObject>(),
        series = new Array<SeriesVariablepieOptions | SeriesPieOptions>(),
        collections = Zotero.Collections.getByLibrary(1, true);
    function getTimeByKey(key: string) {
        const item = Zotero.Items.getByLibraryAndKey(1, key);
        if (item)
            return new HistoryAnalyzer(item).totalS;
        return 0;
    }
    function process(
        arr: Array<[x: string, y: number, z: number]>,
        item: Zotero.Item
    ) {  // 将item的数组转换为饼图数据
        const tags = item.getTags().map(t => t.tag);  // 标签字符串的数组
        const time = getTimeByKey(item.key);
        for (const tag of tags) {
            const fan = arr.find(i => i[0] === tag);  // 0代表名字
            if (fan) {  // 该标签已记录
                ++fan[1];  // 1代表弧度
                fan[2] += time;  // 2代表厚度
            }
            else
                arr.push([tag, 1, time]);
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
            type: data.at(-1)!.z! > 0 ? 'variablepie' : 'pie',
            data: items.reduce(process, [])
        });
    }

    // 添加未分类条目
    let items = await Zotero.Items.getAll(1, true);
    items = items.filter(it =>
        it.isRegularItem() && it.getCollections().length === 0
    );
    const tottim = items.reduce((sum, item) => sum + getTimeByKey(item.key), 0);
    data.push({
        name: addon.locale.unfiled,
        drilldown: 'unfiled',
        y: items.length,
        z: tottim
    });
    addon.log(data, series);
    return { data, series };
}

export default {
    async mounted() {
        const { data, series } = await drawVariablePie();
        const board = await Dashboards.board('container', {
            gui: {
                layouts: [{
                    rows: [{
                        cells: [
                            { id: 'cell-schedule' },
                            {
                                id: 'cell-r1-c2',
                                width: '700px',
                                layout: {
                                    rows: [
                                        { cells: [{ id: 'cell-skyline', height: '130px' }] },
                                        {
                                            cells: [
                                                { id: 'cell-pie' },
                                                { id: 'cell-kpi' },
                                                // { id: 'cell-progress' }
                                            ]
                                        }
                                    ]
                                }
                            }
                        ]
                    }]
                }]
            },
            components: [{
                cell: 'cell-schedule',
                type: 'Highcharts',
                chartOptions: {
                    title: { text: addon.locale.chartTitle.schedule },
                    exporting: { enabled: false },
                    xAxis: [
                        {
                            opposite: true,
                            categories: addon.locale.weekdays,
                            crosshair: true,
                        },
                        { opposite: false },
                    ],
                    yAxis: {
                        title: { text: addon.locale.time },
                        labels: { formatter: ctx => toTimeString(ctx.value) },
                    },
                    tooltip: {
                        pointFormatter: function () {
                            return toTimeString(this.y ?? 0);
                        },
                    },
                    series: drawSchedule()
                } as Highcharts.Options
            }, {
                cell: 'cell-skyline',
                type: 'HTML',
                elements: [{ tagName: 'div' }]
            }, {
                cell: 'cell-kpi',
                type: 'KPI',
                title: addon.locale.chartTitle.readToday,
                value: analyzer.getByDay(new Date().getDay()),
                valueFormatter: toTimeString
            }, {
                cell: 'cell-pie',
                type: 'Highcharts',
                chartOptions: {
                    title: { text: addon.locale.chartTitle.pie },
                    subtitle: { text: addon.locale.chartTitle.pieSub },
                    plotOptions: {
                        pie: { allowPointSelect: true },
                        variablepie: { allowPointSelect: true }
                    },
                    tooltip: {
                        useHTML: true,
                        pointFormatter: function () {
                            const dot = `<span style="color: var(--highcharts-color-${this.colorIndex})">\u25CF</span>`;
                            return `
                                ${dot} ${addon.locale.itemsCount}: <b>${this.y}</b><br/>
                                ${dot} ${addon.locale.totalTime}: <b>${toTimeString((this as any).z)}</b>
                            `;
                        }
                    },
                    drilldown: { series },
                    series: [{
                        name: Zotero.Libraries.getName(1),
                        type: 'variablepie',
                        minPointSize: 10,
                        innerSize: '20%',
                        zMin: 0,
                        colorByPoint: true,
                        data
                    } as SeriesVariablepieOptions]
                } as Highcharts.Options
            }]
        }, true),
            component = board.mountedComponents.find(c => c.options.cell == 'cell-skyline')!;
        // 等待DOM挂载后把组件移动到对应位置
        component.component.contentElement.appendChild(document.getElementById('skyline')!);

        addon.log('overview board loaded', board);
    },
    data() {
        return {
            locale: addon.locale,
            theme: addon.getPref('useDarkTheme') ? 'light' : 'light'  // TODO: dark
        };
    },
    components: { Skyline }
};
</script>

<template>
    <div id="container" :className="'highcharts-' + theme"></div>
    <Skyline id="skyline" />
</template>

<style scoped></style>
