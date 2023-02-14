<template>
    <Chart :options="options" :key="theme"></Chart>
</template>

<script lang="ts">
import type { AttachmentHistory } from 'zotero-reading-history';
import { Chart } from 'highcharts-vue';
import { defineComponent } from 'vue';
import Highcharts from '@/utility/highcharts';
import { toTimeString } from '@/utility/utils';

export default defineComponent({
    data() {
        return {
            chartOpts: {
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
                tooltip: {
                    formatter: function (
                        this: Highcharts.TooltipFormatterContextObject,
                        tooltip: Highcharts.Tooltip
                    ) {
                        return `<b>${this.series.name}</b><br>${
                            toolkit.locale.date
                        }: ${Highcharts.dateFormat(
                            '%Y-%m-%d',
                            this.x as number
                        )}<br>${toolkit.locale.time}: ${toTimeString(
                            this.y as number
                        )}`;
                    },
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
                const firstTime = attHis.record.firstTime,
                    lastTime = attHis.record.lastTime,
                    ha = new toolkit.HistoryAnalyzer([attHis]),
                    data: Highcharts.PointOptionsObject[] = [];
                // 遍历每天
                if (firstTime && lastTime)
                    for (let i = firstTime; i <= lastTime; i += 86400) {
                        const date = new Date(i * 1000);
                        data.push({ x: i * 1000, y: ha.getByDate(date) });
                    }
                return {
                    name: newHis.length > 1 ? ha.titles[0] : undefined,
                    data,
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
