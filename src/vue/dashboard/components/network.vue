<template>
    <Chart :options="options" :key="searching" ref="chartRef"></Chart>
</template>

<script lang="ts">
import { Chart } from 'highcharts-vue';
import { defineComponent, type PropType } from 'vue';
import Highcharts from '@/highcharts';
import HistoryAnalyzer from '$/history/analyzer';
import type { AttachmentHistory } from '$/history/history';
import { toTimeString } from '$/utils';
import type { SeriesNetworkgraphNodesOptions } from 'highcharts';

type GraphData = Array<[from: number, to: number]>;

export default defineComponent({
    components: { Chart },
    data() {
        return {
            searching: false,
            graphData: [] as GraphData,
            graphNodes: [] as SeriesNetworkgraphNodesOptions[],
        }
    },
    computed: {
        options() {
            return Highcharts.merge(this.chartOpts, this.theme);
        },
        chartOpts() {
            return {
                plotOptions: {
                    networkgraph: {
                        keys: ['from', 'to'],
                        layoutAlgorithm: {
                            enableSimulation: true,
                            initialPositions: 'random',
                        },
                    },
                },
                tooltip: {
                    formatter: function () {
                        if ('custom' in this.point)
                            return `
                                <b>${(this.point as any).custom.title}</b><br>
                                <span>${addon.locale.time}: ${toTimeString(
                                    (this.point as any).custom.time
                            )}</span>`;
                        return '';
                    },
                },
                series: [{
                    type: 'networkgraph',
                    data: this.graphData,
                    nodes: this.graphNodes,
                } as Highcharts.SeriesNetworkgraphOptions],
            } as Highcharts.Options;
        }
    },
    methods: {
        async getGraphData() {
            const nodes: { [key: string]: boolean } = {},
                edges: { [edge: string]: boolean } = {},
                nodeItem: { [key: string]: Zotero.DataObject } = {},
                data: GraphData = [],
                top = this.topLevel!,
                chartRef = (this.$refs.chartRef as Chart)?.chart;
            chartRef?.showLoading();
            this.searching = true;

            async function dfs(it: Zotero.Item) {
                nodes[it.key] = true; // 访问该节点
                await addon.getGlobal('Zotero').Promise.delay(0); // 防止卡死

                for (const key of it.relatedItems) {
                    const t = addon
                        .getGlobal('Zotero')
                        .Items.getByLibraryAndKey(top.libraryID, key);
                    if (!t) continue;

                    nodeItem[key] ??= t;
                    if (!edges[`${t.id},${it.id}`]) data.push([it.id, t.id]); // 已经有反向边了
                    edges[`${it.id},${t.id}`] = true; // 加边
                    if (!nodes[key] && Object.keys(nodes).length < 10) 
                        dfs(t as Zotero.Item); // 递归
                }
            }
            await dfs(top);

            const items = Object.values(nodeItem) as Zotero.Item[],
                points = items.map(it => {
                    let his: AttachmentHistory[];
                    if (it.isRegularItem())
                        his = addon.history.getInTopLevelSync(it);
                    else {
                        const att = addon.history.getByAttachment(it);
                        his = att ? [att] : [];
                    }
                    return {
                        name: it.firstCreator,
                        //@ts-expect-error
                        id: it.id as string,
                        selected: it.id == top.id,
                        dataLabels: { enabled: true },
                        marker: { radius: 16 },
                        custom: {
                            title: it.getField('title'),
                            time: new HistoryAnalyzer(his).totalS,
                        },
                    } as SeriesNetworkgraphNodesOptions;
                });
            this.graphData = data;
            this.graphNodes = points;
            chartRef?.hideLoading();
            this.searching = false;
        }
    },
    watch: {
        itemID(val?: number) {
            if (val && !this.searching)
                this.getGraphData();
        },
    },
    props: { topLevel: Object as PropType<Zotero.Item>, theme: Object, itemID: Number },
});
</script>
