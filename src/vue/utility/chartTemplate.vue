<script lang="ts">
import type { Options } from 'highcharts';
import type { AttachmentHistory } from 'zotero-reading-history';
import { defineComponent } from 'vue';
import Highcharts from '@/utility/highcharts';
export default defineComponent({
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
    },
    watch: { history(his: AttachmentHistory[]) {} },
    props: {
        history: {
            type: Array<AttachmentHistory>,
            required: true,
        },
        theme: Object,
    },
});
</script>
<script lang="ts" setup>
import { Chart } from 'highcharts-vue';
</script>

<template>
    <Chart :options="options" :key="theme"></Chart>
</template>

<style scoped></style>
