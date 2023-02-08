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
                chart: {
                    panning: {
                        enabled: true,
                        type: 'x',
                    },
                    zooming: {
                        type: 'x',
                        key: 'shift',
                    },
                },
                xAxis: { title: { text: toolkit.locale.date } },
                series: [{}],
            } as Highcharts.Options,
        };
    },
    watch: {
        history(oldHis: AttachmentHistory, newHis: AttachmentHistory) {
            toolkit.log(oldHis, newHis);
            if (!newHis) return;

            const firstTime = newHis.record.firstTime,
                lastTime = newHis.record.lastTime,
                ha = new toolkit.HistoryAnalyzer([newHis]),
                series = this.options.series![0] as Highcharts.SeriesBarOptions,
                xAxis = this.options.xAxis as Highcharts.AxisOptions;

            xAxis.categories = [];
            series.data = [];
            // 遍历每天
            if (firstTime && lastTime)
                for (let i = firstTime; i <= lastTime; i += 86400) {
                    const date = new Date(i * 1000);
                    xAxis.categories.push(date.toLocaleDateString());
                    series.data.push(ha.getByDate(date));
                }
        },
    },
    props: { history: { required: false } },
    components: { Chart },
});
</script>
