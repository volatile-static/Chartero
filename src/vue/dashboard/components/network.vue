<template>
    <Chart constructor-type="chart" :options="options" :key="theme"></Chart>
</template>

<script lang="ts">
import { Chart } from 'highcharts-vue';
import { defineComponent, type PropType } from 'vue';
import Highcharts from '../../utility/highcharts';

function onPointClick(
    this: Highcharts.PlotNetworkgraphOnPointOptions,
    event: Highcharts.PointClickEventObject
) {
    if (event.ctrlKey) Zotero.Chartero.viewItemInLib(this.id);
}

type GraphData = Array<[from: number, to: number]>;

export default defineComponent({
    data() {
        return {
            chartOpts: {
                subtitle: { text: toolkit.locale.chartTitle.networkSub },
                plotOptions: {
                    series: { shadow: true },
                    networkgraph: {
                        layoutAlgorithm: {
                            enableSimulation: true,
                            initialPositions: 'random',
                        },
                    },
                },
                series: [
                    {
                        type: 'networkgraph',
                        name: toolkit.locale.chartTitle.network,
                        point: {
                            events: { click: onPointClick },
                        },
                        link: { width: 6 },
                        nodes: new Array<Highcharts.SeriesNetworkgraphNodesOptions>(),
                        data: [] as GraphData,
                    } as Highcharts.SeriesNetworkgraphOptions,
                ],
            } as Highcharts.Options,
        };
    },
    computed: {
        options() {
            return Highcharts.merge(this.chartOpts, this.theme);
        },
    },
    watch: {
        topLevel(item: Zotero.Item) {
            toolkit.log(item);
            if (!item) return;

            const series = this.chartOpts
                    .series![0] as Highcharts.SeriesNetworkgraphOptions,
                nodes: { [key: string]: boolean } = {},
                edges: { [edge: string]: boolean } = {},
                nodeItem: { [key: string]: Zotero.DataObject } = {};

            function dfs(it: Zotero.Item) {
                nodes[it.key] = true; // 访问该节点
                for (const key of it.relatedItems) {
                    const t = Zotero.Items.getByLibraryAndKey(
                        item.libraryID,
                        key
                    );
                    if (!t) continue;
                    nodeItem[key] ??= t;
                    if (!edges[`${t.id},${it.id}`])
                        (series.data as GraphData).push([it.id, t.id]); // 已经有反向边了
                    edges[`${it.id},${t.id}`] = true; // 加边
                    if (!nodes[key]) dfs(t as Zotero.Item); // 递归
                }
            }
            dfs(item);

            const items = Object.values(nodeItem) as Zotero.Item[];

            series.nodes = items.map(it => ({
                name: it.firstCreator,
                id: it.id.toString(),
                selected: it.id == item.id,
            }));
            toolkit.log(series, items, nodes);
        },
    },
    props: { topLevel: Object as PropType<Zotero.Item>, theme: Object },
    components: { Chart },
});
</script>
