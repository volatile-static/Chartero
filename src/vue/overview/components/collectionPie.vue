<script lang="ts">
import type { Options } from 'highcharts';
import Highcharts from '@/highcharts';
export default {
    data() {
        return {
            chartOpts: {} as Options,
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
