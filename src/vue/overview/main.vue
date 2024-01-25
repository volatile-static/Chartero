<script lang="ts">
import Skyline from './components/skyline.vue';
import HistoryAnalyzer from '$/history/analyzer';
import { toTimeString, accumulate } from '$/utils';
import { splitOtherData } from '@/utils';
import { Dashboards } from '@/highcharts';
import type {
    SeriesVariablepieOptions,
    SeriesColumnOptions,
    SeriesSplineOptions,
    PointOptionsObject,
    SeriesPieOptions
} from 'highcharts';

const excludedTags = addon.getPref('excludedTags'),
    libraryHistory = addon.history.getInLibrary(),
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
            tooltip: { headerFormat: '{point.x}:00~{add point.x 1}:00<br/>' },
            xAxis: 1
        } as SeriesSplineOptions
    ];
}

async function drawVariablePie() {
    function getTime(item: Zotero.Item) {
        return new HistoryAnalyzer(item).totalS;
    }
    function process(
        arr: Array<PointOptionsObject>,
        item: Zotero.Item
    ) {  // 将item的数组转换为饼图数据
        const tags = item.getTags().filter(t => t.type).map(t => t.tag).filter(t => {
            const id = Zotero.Tags.getID(t);
            return id && !excludedTags.includes(id);
        });  // 标签字符串的数组
        const time = getTime(item);
        for (const tag of tags) {
            const fan = arr.find(i => i.name === tag);  // 0代表名字
            if (fan) {  // 该标签已记录
                ++fan.y!;  // 1代表弧度
                fan.z! += time;  // 2代表厚度
            }
            else
                arr.push({ name: tag, y: 1, z: time });
        }
        return arr;
    }
    const data = new Array<PointOptionsObject>(),
        series = new Array<SeriesVariablepieOptions | SeriesPieOptions>(),
        userLib = Zotero.Libraries.userLibraryID,
        collections: Array<Zotero.Collection | Zotero.Search> =
            Zotero.Collections.getByLibrary(userLib, true),
        unfiled = new Zotero.Search({
            libraryID: userLib,
            name: addon.locale.unfiled
        });
    // 添加未分类条目
    unfiled.addCondition('unfiled', 'true');
    unfiled.addCondition('itemType', 'isNot', 'note');
    collections.push(unfiled);

    for (const collection of collections) {
        const items = collection instanceof Zotero.Collection
            ? collection.getChildItems()
            : Zotero.Items.get(await collection.search()),
            drilldownData = items.reduce(process, []),
            [major, minor] = splitOtherData(drilldownData);
        if (major.length < 2 || minor.length < 2)
            major.push(...minor);
        else
            major.push({
                name: addon.locale.others,
                sliced: true,
                y: accumulate(minor, 'y'),
                z: accumulate(minor, 'z')
            });
        data.push({
            name: collection.name,
            drilldown: collection.name,
            y: items.length,  // 条目数作为扇形角度
            z: items.reduce((sum, item) =>
                sum + getTime(item), 0)  // 从0开始加
        });
        series.push({
            name: collection.name,
            id: collection.name,
            type: data.at(-1)!.z! > 0 ? 'variablepie' : 'pie',
            data: major
        });
    }
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
                                                { id: 'cell-pie', width: '60%' },
                                                // { id: 'cell-kpi' },
                                                { id: 'cell-progress', width: '40%' }
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
                    exporting: { enabled: false },
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
                        name: Zotero.Libraries.userLibrary.name,
                        type: 'variablepie',
                        minPointSize: 10,
                        innerSize: '20%',
                        zMin: 0,
                        colorByPoint: true,
                        allowPointSelect: false,
                        data
                    } as SeriesVariablepieOptions]
                } as Highcharts.Options
            }, {
                cell: 'cell-progress',
                type: 'HTML',
                elements: [{
                    tagName: 'div',
                    children: [{
                        tagName: 'h2',
                        textContent: addon.locale.overallProgress,
                        style: { textAlign: 'center' }
                    }]
                }]
            }]
        }, true);

        // 等待DOM挂载后把组件移动到对应位置
        for (const component of board.mountedComponents)
            switch (component.options.cell) {
                case 'cell-skyline':
                    component.component.contentElement.appendChild(document.getElementById('skyline')!);
                    break;
                case 'cell-progress':
                    component.component.contentElement.appendChild(document.getElementById('progress')!);
                    break;
                default:
                    break;
            }
        addon.log('overview board loaded', board);
    },
    data() {
        return {
            overallProgress: analyzer.progress,
            locale: addon.locale,
            theme: 'light'  // TODO: dark
        };
    },
    components: { Skyline }
};
</script>

<template>
    <div id="container"></div>
    <Skyline id="skyline" />
    <TProgress id="progress" theme="circle" size="large" :percentage="overallProgress" />
</template>

<style scoped>
#progress {
    position: relative;
    left: calc(50% - 80px);
    top: calc(50% - 160px);
}
</style>
