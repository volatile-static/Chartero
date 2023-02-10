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
                xAxis: { title: { text: toolkit.locale.pageNum } },
                series: [{ type: 'bar' }],
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
            } as Highcharts.Options,
        };
    },
    computed: {
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
    watch: {
        history(his: AttachmentHistory[]) {
            if (his.length < 1) return;

            this.chartOpts.series = his.map(attHis => {
                const firstPage = attHis.record.firstPage,
                    lastPage = attHis.record.lastPage,
                    data: number[] = [];
                for (let i = firstPage; i <= lastPage; ++i)
                    data.push(attHis.record.pages[i]?.totalS ?? 0);
                return {
                    type: 'bar',
                    name: his.length > 1 ? getTitle(attHis) : undefined,
                    data,
                } as Highcharts.SeriesBarOptions;
            });
            this.chartOpts.legend!.enabled = his.length > 1;
        },
    },
    components: { Chart },
});
</script>
