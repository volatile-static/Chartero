<script lang="ts">
import type { Options } from 'highcharts';
import type { AttachmentHistory } from '$/history/history';
import { nextTick } from 'vue';
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
                chart: {
                    zooming: { type: undefined },
                    animation: undefined
                },
                tooltip: {
                    formatter: function (this: Highcharts.TooltipFormatterContextObject) {
                        const item = addon.getGlobal('Zotero').Items.get(this.key!);
                        return item.getField('title');
                    }
                },
                series: [{
                    type: 'networkgraph',
                    data: this.seriesData,
                    layoutAlgorithm: {
                        enableSimulation: true,
                        // linkLength: 100
                    },
                    dataLabels: {
                        enabled: true,
                        linkTextPath: { attributes: { dy: 2.5 } },
                        linkFormat: '>'
                    }
                } as Highcharts.SeriesNetworkgraphOptions],
            } as Options;
        },
        options() {
            return Highcharts.merge(this.chartOpts, this.theme);
        },
    },
    methods: {
        async processReferenceNetwork() {
            const chartRef = (this.$refs.chartRef as Chart)?.chart;
            chartRef.showLoading();

            const promiseList = this.history.map(async it => {
                const attachments = addon.getGlobal('Zotero').Items.get(it.getAttachments()),
                    attText = await Promise.all(attachments.map(att => att.attachmentText));
                chartRef.showLoading(it.getField('title'));
                return attText.filter(Boolean).join('\n');  // 连接所有附件的全文
            }),
                textList = await Promise.all(promiseList);

            this.seriesData = [];
            for (let i = 0; i < textList.length; ++i)
                for (let j = i + 1; j < textList.length; ++j)  // 如果i引用了j
                    if (textList[i].includes(this.history[j].getField('title'))) {
                        addon.log(`Found ${this.history[j].id} cited by ${this.history[i].id}`);
                        this.seriesData.push([this.history[i].id, this.history[j].id]);
                    }
            chartRef.hideLoading();
        }
    },
    mounted() {
        this.processReferenceNetwork();
    },
    watch: {
        async history(items: Zotero.Item[]) {
            // const promiseList = await Promise.all(items.map(async it => {
            //     const att = await it.getBestAttachment();
            //     return att && await att.attachmentText;
            // })),
            //     textList = promiseList.filter(Boolean) as string[];
            // this.seriesData = [];
            // for (let i = 0; i < textList.length; ++i)
            //     for (let j = i + 1; j < textList.length; ++j) {
            //         const similarity = 100 * jaccardSimilarity(textList[i], textList[j]);
            //         for (let k = 0; k < similarity; ++k)
            //             this.seriesData.push([i, j]);
            //     }

            nextTick(this.processReferenceNetwork);
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
    <Chart :options="options" :key="seriesData" ref="chartRef"></Chart>
</template>

<style scoped></style>
