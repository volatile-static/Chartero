<script lang="ts">
import type { Options } from 'highcharts';
import type { AttachmentHistory } from '$/history/history';
import { Chart } from 'highcharts-vue';
import Highcharts from '@/highcharts';
export default {
    components: { Chart },
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

<template>
    <Chart :options="options" :key="theme"></Chart>
</template>

<style scoped></style>
