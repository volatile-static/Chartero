<script lang="ts">
import type { Options } from 'highcharts';
import type { AttachmentHistory } from '$/history/history';
import { Chart } from 'highcharts-vue';
import Highcharts from '@/highcharts';
import { jaccardSimilarity } from '@/utils';
export default {
    components: { Chart },
    data() {
        return { locale: addon.locale, seriesData: [] as Highcharts.PointOptionsObject[] };
    },
    computed: {
        chartOpts() {
            return {
                plotOptions: {
                    networkgraph: {
                        layoutAlgorithm: {
                            enableSimulation: true,
                            linkLength: 100
                        },
                    }
                },
                chart: {
                    zooming: { type: undefined },
                    animation: undefined
                },
                series: [{
                    type: 'networkgraph',
                    data: this.seriesData,
                } as Highcharts.SeriesNetworkgraphOptions],
            } as Options;
        },
        options() {
            return Highcharts.merge(this.chartOpts, this.theme);
        },
    },
    watch: {
        async history(items: Zotero.Item[]) {
            const promiseList = await Promise.all(items.map(async it => {
                const att = await it.getBestAttachment();
                return att && await att.attachmentText;
            })),
                textList = promiseList.filter(Boolean) as string[];
            this.seriesData = [];
            for (let i = 0; i < textList.length; ++i)
                for (let j = i + 1; j < textList.length; ++j) {
                    const similarity = 100 * jaccardSimilarity(textList[i], textList[j]);
                    for (let k = 0; k < similarity; ++k)
                        this.seriesData.push([i, j]);
                }
        }
    },
    props: {
        history: {
            type: Array<Zotero.Item>,
            required: true,
        },
        theme: Object,
    },
};
</script>

<template>
    <Chart :options="options" :key="seriesData"></Chart>
</template>

<style scoped></style>
