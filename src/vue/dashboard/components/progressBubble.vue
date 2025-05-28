<script lang="ts">
import type {
    Options,
    PointOptionsObject,
    SeriesScatterOptions,
} from 'highcharts';
import Highcharts from '@/highcharts';
import HistoryAnalyzer from '$/history/analyzer';
import type { AttachmentHistory } from '$/history/history';
export default {
    data() {
        return { locale: addon.locale };
    },
    computed: {
        chartOpts() {
            return {
                chart: { zooming: { type: 'xy' } },
                xAxis: {
                    type: 'datetime',
                    title: { text: addon.locale.date },
                },
                yAxis: { title: { text: addon.locale.pageNum } },
                colorAxis: {},
                series: this.history.map(his => {
                    return {
                        type: 'scatter',
                        cluster: { enabled: true },
                        allowPointSelect: false,
                        name: new HistoryAnalyzer([his]).titles[0],
                        colorKey: 'z',
                        data: Object.keys(his.record.pages).reduce(
                            (arr, idx) => {
                                const page = his.record.pages[Number(idx)],
                                    periods = page.period;
                                if (periods)
                                    for (const t in periods)
                                        arr.push({
                                            x: parseInt(t) * 1000,
                                            y: parseInt(idx),
                                            z: periods[t],
                                        });
                                return arr;
                            },
                            [] as PointOptionsObject[]
                        ),
                    } as SeriesScatterOptions;
                }),
            } as Options;
        },
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
};
</script>
<script lang="ts" setup>
import { Chart } from 'highcharts-vue';
</script>

<template>
  <Chart :key="JSON.stringify(theme)" :options="options" />
</template>

<style scoped></style>
