<template>
    <Chart :options="options" :key="theme"></Chart>
</template>

<script lang="ts">
import type { AttachmentHistory } from 'zotero-reading-history';
import { Chart } from 'highcharts-vue';
import { defineComponent } from 'vue';
import Highcharts from '@/utility/highcharts';
import { toTimeString } from '@/utility/utils';
import type { Tooltip, TooltipFormatterContextObject } from 'highcharts';

export default defineComponent({
    data() {
        return {
            chartOpts: {
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
                tooltip: {
                    formatter: function (this: TooltipFormatterContextObject, tooltip: Tooltip) {
                        const result = tooltip.chart.series.length > 1
                            ? `${this.series.name}:<br>`
                            : '';
                        return (
                            result +
                            `${toolkit.locale.pageNum}: ${
                                (this.x as number) + 1
                            }<br>${toolkit.locale.time}: ${toTimeString(
                                this.y!
                            )}`
                        );
                    },
                },
                series: [{ type: 'bar' }],
                chart: {
                    panning: {
                        enabled: true,
                        type: 'x',
                    },
                    zooming: {
                        type: 'x',
                        key: 'shift',
                    },
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

            this.chartOpts.series = his.map(attHis => {
                const ha = new toolkit.HistoryAnalyzer([attHis]),
                    firstPage = attHis.record.firstPage,
                    lastPage = attHis.record.lastPage,
                    data: number[] = [];
                for (let i = firstPage; i <= lastPage; ++i)
                    data.push(attHis.record.pages[i]?.totalS ?? 0);
                return {
                    type: 'bar',
                    name: his.length > 1 ? ha.titles[0] : undefined,
                    data,
                } as Highcharts.SeriesBarOptions;
            });
            this.chartOpts.legend!.enabled = his.length > 1;
        },
    },
    components: { Chart },
});
</script>
