<template>
  <Chart :key="theme" ref="chart" :options="options" />
</template>

<script lang="ts">
import { Chart } from 'highcharts-vue';
import { defineComponent } from 'vue';
import { buttons, helpMessageOption } from '@/utils';
import Highcharts from '@/highcharts';
import HistoryAnalyzer from '$/history/analyzer';
import type {
    ExportingOptions,
    Options,
    SeriesSplineOptions,
    Tooltip,
    TooltipFormatterContextObject,
} from 'highcharts';
import type { AttachmentHistory } from '$/history/history';
import { toTimeString } from '$/utils';

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
        `${addon.locale.date}: ${Highcharts.dateFormat(
            '%Y-%m-%d',
            this.x as number
        )}<br>${addon.locale.time}: ${toTimeString(this.y as number)}`
    );
}

export default defineComponent({
    data() {
        return {
            chartOpts: {
                exporting: {
                    buttons,
                    menuItemDefinitions: helpMessageOption(
                        addon.locale.doc.dateTime
                    ),
                } as ExportingOptions,
                plotOptions: { series: { cursor: 'auto' } },
                legend: { enabled: false },
                tooltip: {
                    formatter: tooltipFormatter,
                },
                xAxis: {
                    type: 'datetime',
                    title: { text: addon.locale.date },
                },
                yAxis: {
                    title: { text: addon.locale.time },
                    labels: { formatter: ctx => toTimeString(ctx.value) },
                },
                series: [{}],
            } as Options,
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
            (this.$refs.chart as Chart).chart.hideData();

            this.chartOpts.series = newHis.map(attHis => {
                const ha = new HistoryAnalyzer([attHis]);
                return {
                    type: 'spline',
                    name:
                        newHis.length > 1
                            ? ha.titles[0]
                            : `${addon.locale.time}(${addon.locale.seconds})`,
                    data: ha.dateTimeStats.map(obj => [obj.date, obj.time]),
                } as SeriesSplineOptions;
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
