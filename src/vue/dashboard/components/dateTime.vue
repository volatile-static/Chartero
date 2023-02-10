<template>
    <Chart constructor-type="chart" :options="options" :key="theme"></Chart>
</template>

<script lang="ts">
import type { AttachmentHistory } from 'zotero-reading-history';
import { Chart } from 'highcharts-vue';
import { defineComponent } from 'vue';
import { getTitle } from '../../utility/utils';
import Highcharts from '../../utility/highcharts';

export default defineComponent({
    data() {
        return {
            chartOpts: {
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
                legend: { enabled: false },
                xAxis: { title: { text: toolkit.locale.date } },
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
        history(newHis: AttachmentHistory[]) {
            if (!newHis) return;

            this.chartOpts.series = newHis.map(attHis => {
                const firstTime = attHis.record.firstTime,
                    lastTime = attHis.record.lastTime,
                    ha = new toolkit.HistoryAnalyzer([attHis]),
                    data: number[] = [];
                // 遍历每天
                if (firstTime && lastTime)
                    for (let i = firstTime; i <= lastTime; i += 86400) {
                        const date = new Date(i * 1000);
                        data.push(ha.getByDate(date));
                    }
                return {
                    name: newHis.length > 1 ? getTitle(attHis) : undefined,
                    data,
                } as Highcharts.SeriesLineOptions;
            });
            this.chartOpts.legend!.enabled = newHis.length > 1;
        },
    },
    props: {
        history: { type: Array<AttachmentHistory>, required: true },
        theme: Object,
    },
    components: { Chart },
});
</script>
