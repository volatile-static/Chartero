<template>
    <Chart :options="options" :key="refresh" ref="chartRef"></Chart>
</template>

<script lang="ts">
import { Chart } from 'highcharts-vue';
import { defineComponent, type PropType } from 'vue';
import Highcharts from '@/highcharts';
import HistoryAnalyzer from '$/history/analyzer';
import { toTimeString } from '$/utils';
import type { SeriesNetworkgraphNodesOptions } from 'highcharts';

type GraphData = Array<[from: string, to: string]>;

export default defineComponent({
    components: { Chart },
    computed: {
        options() {
            return Highcharts.merge(this.chartOpts, this.theme);
        },
        chartOpts() {
            addon.log(this.graphData, this.graphNodes);
            return {
                plotOptions: {
                    networkgraph: {
                        layoutAlgorithm: {
                            enableSimulation: false,
                            // initialPositions: 'random',
                        },
                    },
                    series: {
                        point: {
                            events: {
                                click: ({ point }) => this.loadNode((point as any).id)
                            }
                        }
                    }
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
                colorAxis: {
                    dataClasses: [{
                        color: this.thisColor,
                        name: addon.locale.thisItem,
                    }, {
                        color: this.thatColor,
                        name: addon.locale.relatedItems,
                    }]
                },
                legend: {
                    itemHoverStyle: { cursor: 'default' }
                },
                chart: {
                    events: {
                        load: function () {
                            for (const it of this.legend.allItems)
                                Highcharts.removeEvent(
                                    (it as any).legendItem.group.element,
                                    'click'
                                )
                        }
                    }
                }
            } as Highcharts.Options;
        },
    },
    data() {
        return {
            refresh: 0,
            loading: false,
            thisColor: 'blue',
            thatColor: 'red',
            graphData: [] as GraphData,
            graphNodes: [] as SeriesNetworkgraphNodesOptions[],
            visitNodes: {} as { [id: string]: boolean },
            nodeSet: new Set<number>(),
        }
    },
    mounted() {
        const ref = (this.$refs.chartRef as Chart).chart,
            colors = ref.options.colors;
        this.thisColor = colors?.at(0) as string ?? 'blue';
        this.thatColor = colors?.at(1) as string ?? 'red';
    },
    methods: {
        async loadNode(id: string) {
            if (this.loading || this.visitNodes[id]) return;
            const item = Zotero.Items.get(parseInt(id)),
                data: GraphData = [],
                nodes: Array<SeriesNetworkgraphNodesOptions> = [],
                chartRef = (this.$refs.chartRef as Chart).chart;
            if (!item) return;

            this.loading = true;
            chartRef?.showLoading();
            this.visitNodes[id] = true;
            if (!this.nodeSet.has(item.id))
                nodes.push(this.createNode(item));

            for (const key of item.relatedItems) {
                const it = <Zotero.Item>Zotero.Items
                    .getByLibraryAndKey(this.topLevel!.libraryID, key);
                if (!it || this.visitNodes[it.id])
                    continue;
                data.push([String(item.id), String(it.id)]);
                if (!this.nodeSet.has(it.id))
                    nodes.push(this.createNode(it));
                await Zotero.Promise.delay(0);  // 调度到后台，防止阻塞UI
            }
            addon.log(data, nodes, this.nodeSet.size);
            this.graphData.push(...data);
            this.graphNodes.push(...nodes);
            ++this.refresh;

            if (data.length + nodes.length > 0) {
                const maxTime = this.graphNodes.reduce(
                    (max, node) => Math.max(max, (node as any).custom.time),
                    0
                );
                for (const node of this.graphNodes) {
                    node.marker = {
                        radius: Math.max(
                            60 * ((node as any).custom.time / maxTime),
                            8
                        )
                    };
                    if (
                        (node as any).id != this.topLevel?.id &&
                        this.visitNodes[(node as any).id]
                    )
                        node.color = this.thatColor;
                }
            }
            chartRef?.hideLoading();
            this.loading = false;
        },
        createNode(item: Zotero.Item) {
            this.nodeSet.add(item.id);
            return {
                name: item.firstCreator,
                id: String(item.id),
                dataLabels: { enabled: true },
                color: item.id == this.topLevel?.id ? this.thisColor : Highcharts
                    .color(this.thatColor)
                    .setOpacity(0.5)
                    .get() as string,
                custom: {
                    title: item.getField('title'),
                    time: new HistoryAnalyzer(
                        item.isRegularItem()
                            ? addon.history.getInTopLevelSync(item)
                            : addon.history.getByAttachment(item)
                    ).totalS ?? 0,
                },
            } as SeriesNetworkgraphNodesOptions;
        }
    },
    watch: {
        async itemID(newID?: number, oldID?: number) {
            if (newID && !this.loading) {
                if (this.nodeSet.has(newID)) {
                    // 更新当前节点颜色
                    for (const node of this.graphNodes) 
                        if (node.id == newID.toString())
                            node.color = this.thisColor;
                        else if (node.id == oldID?.toString())
                            node.color = this.thatColor;
                    ++this.refresh;
                } else {
                    // 清空缓存并加载新的网络
                    this.graphData = [];
                    this.graphNodes = [];
                    this.visitNodes = {};
                    this.nodeSet.clear();
                    ++this.refresh;
                    this.loadNode(String(newID));
                }
            }
        },
    },
    props: { topLevel: Object as PropType<Zotero.Item>, theme: Object, itemID: Number },
});
</script>
