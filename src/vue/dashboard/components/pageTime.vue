<template>
    <Chart :options="options" :key="theme" ref="chart"></Chart>
</template>

<script lang="ts">
import type { AttachmentHistory } from 'zotero-reading-history';
import { Chart } from 'highcharts-vue';
import { defineComponent } from 'vue';
import Highcharts from '@/utility/highcharts';
import { buttons, toTimeString, helpMessageOption } from '@/utility/utils';
import type {
    Tooltip,
    TooltipFormatterContextObject,
    Point,
    PointClickEventObject,
    ExportingOptions,
} from 'highcharts';

function onPointClick(this: Point, events: PointClickEventObject) {
    const zotero = toolkit.getGlobal('Zotero');
    if (events.ctrlKey)
        zotero.OpenPDF.openToPage(
            zotero.Items.get(Number(this.series.options.id)),
            (this.category as number) + 1
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
        `${toolkit.locale.pageNum}: ${(this.x as number) + 1}<br>${
            toolkit.locale.time
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
                        toolkit.locale.doc.pageTime
                    ),
                } as ExportingOptions,
                plotOptions: {
                    series: { point: { events: { click: onPointClick } } },
                },
                xAxis: {
                    title: { text: toolkit.locale.pageNum },
                    labels: {
                        formatter: ctx => `${(ctx.value as number) + 1}`,
                    },
                },
                yAxis: {
                    title: { text: toolkit.locale.time },
                    labels: { formatter: ctx => toTimeString(ctx.value) },
                },
                subtitle: { text: toolkit.locale.chartTitle.pageTimeSub },
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
                const ha = new toolkit.HistoryAnalyzer([attHis]),
                    firstPage = attHis.record.firstPage,
                    lastPage = attHis.record.lastPage,
                    data: number[] = [];
                for (let i = firstPage; i <= lastPage; ++i)
                    data.push(attHis.record.pages[i]?.totalS ?? 0);
                return {
                    type: 'bar',
                    name: his.length > 1 ? ha.titles[0] : toolkit.locale.time,
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
