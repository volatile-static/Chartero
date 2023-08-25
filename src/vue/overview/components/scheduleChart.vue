<script lang="ts">
import type {
    Options,
    SeriesColumnOptions,
    SeriesSplineOptions,
} from 'highcharts';
import Highcharts from '@/highcharts';
import HistoryAnalyzer from '$/history/analyzer';
import { toTimeString } from '$/utils';
export default {
    data() {
        return {
            chartOpts: {
                xAxis: [
                    {
                        opposite: true,
                        categories: toolkit.locale.weekdays,
                        crosshair: true,
                    },
                    { opposite: false },
                ],
                yAxis: {
                    title: { text: toolkit.locale.seconds },
                    labels: { formatter: ctx => toTimeString(ctx.value) },
                },
                plotOptions: {
                    // line: { marker: { enabled: false } },
                    column: { borderRadius: 2 },
                },
                tooltip: {
                    pointFormatter: function () {
                        return toTimeString(this.y ?? 0);
                    },
                },
                series: [
                    { name: 'week', type: 'column' },
                    { name: 'hour', type: 'spline', xAxis: 1 },
                ],
            } as Options,
            locale: toolkit.locale,
        };
    },
    computed: {
        options() {
            return Highcharts.merge(this.chartOpts, this.theme);
        },
        chartInstance() {
            return (this.$refs.chart as Chart).chart;
        },
    },
    methods: {
        init() {
            const weekData = new Array(7).fill(0),
                hourData = new Array(24).fill(0);
            new HistoryAnalyzer(toolkit.history.getInLibrary()).forEachPeriod(
                (date, time) => {
                    weekData[date.getDay()] += time;
                    hourData[date.getHours()] += time;
                }
            );
            // 17.39ms

            (this.chartOpts.series![0] as SeriesColumnOptions).data = weekData;
            (this.chartOpts.series![1] as SeriesSplineOptions).data = hourData;
            this.chartInstance.hideLoading();
        },
    },
    mounted() {
        this.chartInstance.showLoading();
        setTimeout(this.init, 10);
    },
    props: { theme: Object },
};
</script>
<script lang="ts" setup>
import { Chart } from 'highcharts-vue';
</script>

<template>
    <Chart :options="options" :key="theme" ref="chart"></Chart>
</template>

<style scoped></style>
