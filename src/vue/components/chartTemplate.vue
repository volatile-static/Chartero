<template>
    <Chart constructor-type="chart" ref="chart" :options="options"></Chart>
</template>

<script lang="ts">
import type { AttachmentHistory } from 'zotero-reading-history';
import { Chart } from 'highcharts-vue';
import { defineComponent } from 'vue';
export default defineComponent({
    data() {
        return {
            options: {
                series: [{ type: 'bar' }],
            } as Highcharts.Options,
        };
    },
    watch: {
        history(oldHis: AttachmentHistory, newHis: AttachmentHistory) {
            toolkit.log(oldHis, newHis);
        },
    },
    props: { history: { required: false } },
    components: { Chart },
});
</script>
