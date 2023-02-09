<template>
    <Chart constructor-type="chart" :options="options" :key="theme"></Chart>
</template>

<script lang="ts">
import type { AttachmentHistory } from 'zotero-reading-history';
import { Chart } from 'highcharts-vue';
import { defineComponent } from 'vue';
import Highcharts from './highcharts';

export default defineComponent({
    data() {
        return {
            chartOpts: {
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
        history(newHis: AttachmentHistory) {
            if (!newHis) return;

        },
    },
    props: { history: { required: false }, theme: Object },
    components: { Chart },
});
</script>
