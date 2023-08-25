<script lang="ts">
import type {
    Options,
    PointClickEventObject,
    PointOptionsObject,
    SeriesPackedbubbleOptions,
} from 'highcharts';
import type { AttachmentHistory } from '$/history/history';
import { defineComponent, nextTick } from 'vue';
import { helpMessageOption } from '@/utils';
import Highcharts from '@/highcharts';
import HistoryAnalyzer from '$/history/analyzer';
import { toTimeString } from '$/utils';

async function processSeries(creatorIDs: number[], themeColors: string[]) {
    async function getSeries(creatorID: number) {
        const zotero = addon.getGlobal('Zotero'),
            itemIDs = await zotero.Creators.getItemsWithCreator(creatorID),
            itemsPro = itemIDs.map(id => zotero.Items.getAsync(id)),
            items = await Promise.all(itemsPro),
            dataPro = items.map(async it => {
                const his = await addon.history.getInTopLevel(it),
                    ha = new HistoryAnalyzer(his);
                return {
                    name: it.getField('title'),
                    value: ha.totalS,
                    custom: {
                        libraryID: it.libraryID,
                        itemID: it.id,
                        icon: it.getImageSrc(),
                    },
                } as PointOptionsObject;
            }),
            creator = zotero.Creators.get(creatorID);
        if (dataPro.length < 2) return;
        return {
            type: 'packedbubble',
            name:
                creator.firstName!.length > 0
                    ? creator.firstName + ' ' + creator.lastName
                    : creator.lastName,
            data: await Promise.all(dataPro),
        } as SeriesPackedbubbleOptions;
    }
    let colorCnt = 0;
    const itemColor: { [key: number]: number } = {},
        rawSeries = await Promise.all(creatorIDs.map(getSeries)),
        filtered = rawSeries.filter(it => it) as SeriesPackedbubbleOptions[];
    return filtered.map(series => {
        (series.data as PointOptionsObject[]).forEach(point => {
            const itemID: number = point.custom!.itemID;
            itemColor[itemID] ??= colorCnt++;
            point.color = themeColors[itemColor[itemID] % 9]; // TODO: 换主题色时需要修改
        });
        return series;
    });
}

export default defineComponent({
    data() {
        const onPointClick = (e: PointClickEventObject) => {
            const opts: any = this.chartOpts,
                series = opts.series as SeriesPackedbubbleOptions[],
                selectID = (e.point as PointOptionsObject).custom!.itemID;
            series.forEach(s =>
                (s.data as PointOptionsObject[]).forEach(d => {
                    if (d.custom!.itemID == selectID) d.selected = !d.selected;
                })
            );
        };
        return {
            chartOpts: {
                exporting: {
                    menuItemDefinitions: helpMessageOption(
                        addon.locale.doc.authorBubble
                    ),
                },
                plotOptions: {
                    packedbubble: {
                        minSize: '20%',
                        maxSize: '80%',
                        layoutAlgorithm: {
                            gravitationalConstant: 0.02,
                            splitSeries: true,
                            parentNodeLimit: true,
                        },
                        point: { events: { click: onPointClick } },
                        dataLabels: {
                            enabled: true,
                            useHTML: true,
                            filter: {
                                property: 'radius',
                                operator: '>',
                                value: 30,
                            },
                            format: `<span style="
                                        display: inline-block;
                                        width: 32px;
                                        height: 32px;
                                        background-image: url('{point.custom.icon}');
                                    "></span>`,
                            parentNodeFormat: '{point.name}',
                        },
                    },
                },
                tooltip: {
                    useHTML: true,
                    pointFormatter: function () {
                        const icon = this.options.custom!.icon,
                            style = `
                                display: inline-block;
                                width: 32px;
                                height: 32px;
                                transform: scale(0.5);
                                float: left;
                                background-image: url('${icon}');
                            `,
                            lib = addon
                                .getGlobal('Zotero')
                                .Libraries.get(this.options.custom!.libraryID),
                            libraryName = lib ? lib.name : '',
                            time = toTimeString(this.options.value!);
                        return `
                            <span style="${style}"></span>
                            <b style="float: none">${this.options.name}</b>
                            <br/><span>📂 ${libraryName}</span>
                            <span style="float: right">${time}</span>
                        `;
                    },
                },
                series: [],
            } as Options,
            locale: addon.locale,
        };
    },
    computed: {
        options() {
            return Highcharts.merge(this.chartOpts, this.theme);
        },
    },
    methods: {
        updateSeries(his: AttachmentHistory[]) {
            const ha = new HistoryAnalyzer(his),
                topLevels = ha.parents,
                creatorIDs = topLevels
                    .map(it => it && (it as any)._creatorIDs)
                    .flat(),
                uniqueCreatorIDs = Array.from(new Set(creatorIDs)),
                themeColors =
                    typeof this.theme?.colors[0] == 'string'
                        ? this.theme.colors
                        : (Highcharts.getOptions().colors as string[]),
                chart = (this.$refs.chart as Chart).chart;

            chart.showLoading();
            processSeries(uniqueCreatorIDs, themeColors).then(series => {
                this.chartOpts.series = series;
                nextTick(() => {
                    for (let i = 6; i < chart.series.length; ++i)
                        chart.series[i].setVisible(false, false); // TODO: 切换时似乎未执行
                    chart.hideLoading();
                });
            });
        },
    },
    watch: {
        history(his: AttachmentHistory[]) {
            this.updateSeries(his);
        },
    },
    mounted() {
        this.updateSeries(this.history);
    },
    props: {
        history: {
            type: Array<AttachmentHistory>,
            required: true,
        },
        theme: Object,
    },
});
</script>
<script lang="ts" setup>
import { Chart } from 'highcharts-vue';
</script>

<template>
    <Chart :options="options" :key="theme" ref="chart" style="height: 100%"></Chart>
</template>
