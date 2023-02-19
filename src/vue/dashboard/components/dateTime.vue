<template>
    <Chart :options="options" :key="theme"></Chart>
</template>

<script lang="ts">
import type { AttachmentHistory } from 'zotero-reading-history';
import { Chart } from 'highcharts-vue';
import { defineComponent } from 'vue';
import { exporting, toTimeString } from '@/utility/utils';
import Highcharts from '@/utility/highcharts';

function tooltipFormatter(
    this: Highcharts.TooltipFormatterContextObject,
    tooltip: Highcharts.Tooltip
) {
    const result =
        tooltip.chart.series.length > 1
            ? `<span style="color: ${this.series.color}">\u25CF</span> ${this.series.name}:<br>`
            : '';
    return (
        result +
        `${toolkit.locale.date}: ${Highcharts.dateFormat(
            '%Y-%m-%d',
            this.x as number
        )}<br>${toolkit.locale.time}: ${toTimeString(this.y as number)}`
    );
}

export default defineComponent({
    data() {
        return {
            chartOpts: {
                exporting,
                plotOptions: { series: { cursor: 'auto' } },
                legend: { enabled: false },
                tooltip: {
                    formatter: tooltipFormatter,
                },
                xAxis: {
                    type: 'datetime',
                    title: { text: toolkit.locale.date },
                },
                yAxis: {
                    title: { text: toolkit.locale.time },
                    labels: { formatter: ctx => toTimeString(ctx.value) },
                },
                series: [{}],
            } as Highcharts.Options,
        };
    },
    computed: {
        options() {
            return Highcharts.merge(this.chartOpts, this.theme);
        },
    },
    watch: {
        history(newHis: AttachmentHistory[]) {
            if (!newHis) return;

            this.chartOpts.series = newHis.map(attHis => {
                const ha = new toolkit.HistoryAnalyzer([attHis]);
                return {
                    name: newHis.length > 1 ? ha.titles[0] : undefined,
                    data: ha.dateTimeStats.map(obj => [obj.date, obj.time]),
                } as Highcharts.SeriesLineOptions;
            });
            this.chartOpts.legend!.enabled = newHis.length > 1;
        },
    },
    props: {
        history: { type: Array<AttachmentHistory>, required: true },
        theme: Object,
    },
    components: { Chart },
});
</script>
