<template>
    <Chart constructor-type="chart" :options="options" :key="theme"></Chart>
</template>

<script lang="ts">
import type { AttachmentHistory } from 'zotero-reading-history';
import { Chart } from 'highcharts-vue';
import { defineComponent } from 'vue';
import Highcharts from './highcharts';

function getTitle(his: AttachmentHistory) {
    const Items = toolkit.getGlobal('Zotero').Items,
        item = Items.getByLibraryAndKey(his.note.libraryID, his.key);
    return item && (item as Zotero.Item).getField('title');
}

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
                    name: getTitle(attHis),
                    data,
                } as Highcharts.SeriesBarOptions;
            });
        },
    },
    components: { Chart },
});
</script>
