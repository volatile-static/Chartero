<template>
    <Chart :options="options" :key="theme" ref="chart"></Chart>
</template>

<script lang="ts">
import { Chart } from 'highcharts-vue';
import type {
    Tooltip,
    TooltipFormatterContextObject,
    Point,
    PointClickEventObject,
    ExportingOptions,
} from 'highcharts';
import { defineComponent } from 'vue';
import { buttons, helpMessageOption } from '@/utils';
import Highcharts from '@/highcharts';
import HistoryAnalyzer from '$/history/analyzer';
import type { AttachmentHistory } from '$/history/history';
import { toTimeString } from '$/utils';

function onPointClick(this: Point, events: PointClickEventObject) {
    const zotero = addon.getGlobal('Zotero');
    if (events.ctrlKey)
        zotero.OpenPDF.openToPage(
            zotero.Items.get(Number(this.series.options.id)),
            this.category
        );
    return false;
}

function tooltipFormatter(
    this: TooltipFormatterContextObject,
    tooltip: Tooltip
) {
    const result =
        tooltip.chart.series.length > 1
            ? `<span style="color: ${this.series.color}">\u25CF</span> ${this.series.name}:<br>`
            : '';
    return (
        result +
        `${addon.locale.pageNum}: ${this.x}<br>${addon.locale.time
        }: ${toTimeString(this.y!)}`
    );
}

export default defineComponent({
    data() {
        return {
            chartOpts: {
                exporting: {
                    buttons,
                    menuItemDefinitions: helpMessageOption(
                        addon.locale.doc.pageTime
                    ),
                } as ExportingOptions,
                plotOptions: {
                    series: { point: { events: { click: onPointClick } } },
                },
                xAxis: {
                    title: { text: addon.locale.pageNum },
                    scrollbar: { enabled: true },
                },
                yAxis: {
                    title: { text: addon.locale.time },
                    labels: { formatter: ctx => toTimeString(ctx.value) },
                },
                subtitle: { text: addon.locale.chartTitle.pageTimeSub },
                tooltip: { formatter: tooltipFormatter },
                series: [{ type: 'bar' }],
                chart: {
                    panning: { type: 'x', enabled: true },
                    zooming: { type: 'x', key: 'shift' },
                },
                legend: { enabled: false },
            } as Highcharts.Options,
        };
    },
    computed: {
        options() {
            return Highcharts.merge(this.chartOpts, this.theme);
        },
    },
    props: {
        history: {
            type: Array<AttachmentHistory>,
            required: true,
        },
        theme: Object,
    },
    watch: {
        history(his: AttachmentHistory[]) {
            if (his.length < 1) return;
            (this.$refs.chart as Chart).chart.hideData();
            this.chartOpts.series = his.map(attHis => {
                const ha = new HistoryAnalyzer([attHis]),
                    firstPage = attHis.record.firstPage,
                    lastPage = attHis.record.lastPage,
                    data: number[] = [];
                for (let i = firstPage; i <= lastPage; ++i)
                    data.push(attHis.record.pages[i]?.totalS ?? 0);
                return {
                    type: 'bar',
                    pointStart: firstPage + 1,
                    name:
                        his.length > 1
                            ? ha.titles[0]
                            : `${addon.locale.time}(${addon.locale.seconds})`,
                    data,
                    id: ha.ids[0],
                } as Highcharts.SeriesBarOptions;
            });
            this.chartOpts.legend!.enabled = his.length > 1;
        },
    },
    components: { Chart },
});
</script>
