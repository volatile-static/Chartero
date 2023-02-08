<template>
    <Chart :constructor-type="'chart'" ref="chart" :options="options"></Chart>
</template>

<script lang="ts">
import type { AttachmentHistory } from 'zotero-reading-history';
import { Chart } from 'highcharts-vue';
import { defineComponent, type PropType } from 'vue';

export default defineComponent({
    data() {
        const firstPage = this.history.record.firstPage,
            lastPage = this.history.record.lastPage,
            categories = new Array<string>(),
            data = new Array<number>();

        for (let i = firstPage; i <= lastPage; ++i) {
            categories.push(i.toString());
            data.push(this.history.record.pages[i]?.totalS ?? 0);
        }
        return {
            options: {
                xAxis: {
                    title: { text: toolkit.locale.pagenum },
                    categories,
                },
                series: [
                    {
                        type: 'bar',
                        data,
                    },
                ],
            } as Highcharts.Options,
        };
    },
    props: {
        history: {
            type: Object as PropType<AttachmentHistory>,
            required: true,
        },
    },
    components: { Chart },
    mounted() {
        toolkit.log(this.$refs.chart);
    },
});
</script>
