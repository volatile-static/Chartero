<template>
    <Chart :constructor-type="'chart'" ref="chart" :options="options"></Chart>
</template>

<script lang="ts">
import type { AttachmentHistory } from 'zotero-reading-history';
import { Chart } from 'highcharts-vue';
import { defineComponent } from 'vue';

export default defineComponent({
    data() {
        return {
            options: {
                xAxis: { title: { text: toolkit.locale.pageNum } },
                series: [{ type: 'bar' }],
            } as Highcharts.Options,
        };
    },
    props: {
        history: {
            // type: Object as PropType<AttachmentHistory>,
            required: false,
        },
    },
    watch: {
        history(oldHis: AttachmentHistory, newHis: AttachmentHistory) {
            if (!newHis && !oldHis) return;

            const his = newHis ?? oldHis,
                firstPage = his.record.firstPage,
                lastPage = his.record.lastPage,
                series = this.options.series![0] as Highcharts.SeriesBarOptions,
                xAxis = this.options.xAxis as Highcharts.AxisOptions;

            series.data = new Array();
            xAxis.categories = new Array();
            for (let i = firstPage; i <= lastPage; ++i) {
                xAxis.categories.push(i.toString());
                series.data.push(his.record.pages[i]?.totalS ?? 0);
            }
            toolkit.log(this.options);
        },
    },
    components: { Chart },
});
</script>
