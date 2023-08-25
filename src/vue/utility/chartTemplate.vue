<script lang="ts">
import type { Options } from 'highcharts';
import type { AttachmentHistory } from '$/history/history';
import Highcharts from '@/highcharts';
export default {
    data() {
        return { locale: addon.locale };
    },
    computed: {
        chartOpts() {
            return {
                series: [],
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
    <Chart :options="options" :key="theme"></Chart>
</template>

<style scoped></style>
