<script lang="ts">
import type { Options } from 'highcharts';
import type { AttachmentHistory } from '$/history/history';
import { Chart } from 'highcharts-vue';
import Highcharts from '@/highcharts';
export default {
    components: { Chart },
    props: {
        history: {
            type: Array<AttachmentHistory>,
            required: true,
        },
        theme: {
            type: Object,
            required: true,
        },
    },
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
};
</script>

<template>
  <Chart :key="theme" :options="options" />
</template>

<style scoped></style>
