<template>
  <Chart :key="refresh" ref="chartRef" :options="options" />
</template>

<script lang="ts">
import { Chart } from 'highcharts-vue';
import { defineComponent, type PropType } from 'vue';
import Highcharts from '@/highcharts';
import Tree from '@/tree';
import HistoryAnalyzer from '$/history/analyzer';
import { toTimeString } from '$/utils';
import { helpMessageOption } from '@/utils';
import type {
    SeriesNetworkgraphNodesOptions,
    PointMarkerOptionsObject
} from 'highcharts';

type GraphData = Array<[from: string, to: string]>;

let nodesRef: Highcharts.Point[] = [];
let nodesLayout: { [id: number]: { x?: number, y?: number } } = {};

function layoutPosition(this: any) {
    // console.time('layout');
    for (let i = 0; i < this.nodes.length; ++i)
        if (nodesLayout[this.nodes[i].id]) {
            this.nodes[i].plotX ??= nodesLayout[this.nodes[i].id].x;
            this.nodes[i].plotY ??= nodesLayout[this.nodes[i].id].y;
        }
    // console.timeEnd('layout');
}

export default defineComponent({
    components: { Chart },
    props: {
        topLevel: Object as PropType<Zotero.Item>,
        theme: Object,
        itemID: Number,
        show: Boolean
    },
    data() {
        return {
            restorePosition: false,
            refresh: 0,  // 强制刷新图表
            loading: false,  // 互斥锁
            thisID: this.topLevel?.id,
            thisColor: 'blue',
            thatColor: 'red',
            graphData: [] as GraphData,
            graphNodes: [] as SeriesNetworkgraphNodesOptions[],
            loadedNodes: {} as { [id: string]: boolean },
            visitedNodes: new Set<number>(),
            cachedTree: new Tree(this.topLevel?.id),
            svgStr: Zotero.File.getResource(
                'resource://chartero/icons/star.svg'
            )
        }
    },
    computed: {
        options() {
            return Highcharts.merge(this.theme, this.chartOpts);
        },
        chartOpts() {
            return {
                plotOptions: {
                    networkgraph: {
                        layoutAlgorithm: {
                            enableSimulation: true,
                            maxIterations: 100,
                            initialPositions:
                                this.restorePosition ? layoutPosition : 'circle',
                        },
                    },
                    series: {
                        point: {
                            events: {
                                click: event => {
                                    if (event.shiftKey)  // 按住shift折叠
                                        this.collapseNode(event.point);
                                    else  // 单击加载更多     
                                        this.loadNode((event.point as any).id);
                                }
                            }
                        }
                    }
                },
                tooltip: {
                    formatter () {
                        if ('custom' in this.point)
                            return `
                                <b>${(this.point as any).custom.title}</b><br>
                                <span>${addon.locale.time}: ${toTimeString(
                                (this.point as any).custom.time
                            )}</span>`;
                        return '';
                    },
                },
                series: [
                    {
                        type: 'networkgraph',  // 图表数据
                        data: this.graphData,
                        nodes: this.graphNodes
                    } as Highcharts.SeriesNetworkgraphOptions,
                    {
                        type: 'bubble',  // 图例
                        name: addon.locale.thisItem,
                        marker: {
                            symbol: this.svgURL
                        },
                    },
                    {
                        type: 'bubble',  // 图例
                        name: addon.locale.relatedItems,
                        color: this.thatColor,
                        marker: { fillOpacity: 0.8 },
                    },
                    {
                        type: 'bubble',  // 图例
                        name: addon.locale.collapsedItems,
                        color: this.thatColor,
                        marker: {
                            fillOpacity: 0.2,
                            lineWidth: 2,
                            lineColor: this.thatColor
                        },
                    }
                ],
                legend: {
                    events: { itemClick: () => false },
                    itemHoverStyle: { cursor: 'default' },
                },
                xAxis: [{ visible: false }, { visible: false }],
                yAxis: { visible: false },
                chart: {
                    zooming: { type: undefined },  // 禁止鼠标缩放
                    events: {
                        load: ({ target: chart }) => {
                            // vue的ref不一定能访问series，只好每次更新
                            nodesRef = (chart as any).series[0].nodes;

                            // 初始化颜色
                            const colors = (
                                chart as unknown as Highcharts.Chart
                            ).options.colors;
                            this.thisColor = colors?.at(0) as string ?? 'blue';
                            this.thatColor = colors?.at(1) as string ?? 'red';
                        }
                    },
                    animation: undefined  // 使用默认动画 
                },
                exporting: {
                    menuItemDefinitions: helpMessageOption(
                        addon.locale.doc.network
                    ),
                }
            } as Highcharts.Options;
        },
        svgURL() {  // SVG转DataURL
            return `url(data:image/svg+xml,${encodeURIComponent(
                this.svgStr.replace('fill="red"', `fill="${this.thisColor}"`)
            )})`;
        }
    },
    watch: {
        itemID(newID?: number, oldID?: number) {
            if (newID && !this.loading && this.show) {
                this.thisID = newID;
                if (this.visitedNodes.has(newID))
                    this.updateGraph(newID, oldID);
                else
                    this.initGraph(newID);
            }
        },
        show(newVal: boolean) {
            if (!newVal)
                return;
            if (this.visitedNodes.has(this.topLevel!.id))
                this.updateGraph(this.topLevel!.id, this.thisID);
            else
                this.initGraph(this.topLevel!.id);
            this.thisID = this.topLevel?.id;
        },
        loading(newVal) {
            const chartRef = (this.$refs.chartRef as Chart)?.chart;
            if (newVal)
                chartRef?.showLoading();
            else
                chartRef?.hideLoading();
        }
    },
    methods: {
        async loadNode(id: string) {
            if (this.loading || this.loadedNodes[id]) return;
            const item = Zotero.Items.get(parseInt(id));
            if (!item) return;

            this.loading = true;
            await Zotero.Promise.delay(0);

            const tree = this.cachedTree.find(parseInt(id)),
                data: GraphData = [],
                nodes: Array<SeriesNetworkgraphNodesOptions> = [];
            if (!this.visitedNodes.has(item.id) && item.relatedItems.length)
                nodes.push(this.createNode(item));
            this.loadedNodes[id] = true;

            for (const key of item.relatedItems) {  // 遍历相关条目
                const it = <Zotero.Item>Zotero.Items
                    .getByLibraryAndKey(this.topLevel!.libraryID, key);
                if (!it || this.loadedNodes[it.id])
                    continue;
                data.push([String(item.id), String(it.id)]);  // 加边

                if (!this.visitedNodes.has(it.id)) {
                    nodes.push(this.createNode(it));  // 加点
                    tree?.appendChild(it.id);  // 记录继承关系
                }
                await Zotero.Promise.delay(0);  // 调度到后台，防止阻塞UI
            }
            this.graphData.push(...data);
            this.graphNodes.push(...nodes);
            this.restorePosition = false;  // TODO: 保存当前位置
            ++this.refresh;

            // 结构有变化，更新节点标记
            if (data.length + nodes.length > 0) {
                const maxTime = Math.max(
                    ...this.graphNodes.map((node: any) => node.custom.time)
                );
                for (const node of this.graphNodes) {
                    const size = maxTime ? Math.max(
                        60 * ((node as any).custom.time / maxTime),
                        8
                    ) : 8;
                    node.marker = this.getMarker((node as any).id, size);
                }
            } else {
                const node = this.graphNodes.find(n => n.id == id);
                if (node)
                    node.marker = this.getMarker(parseInt(id), node.marker?.radius);
            }
            ++this.refresh;
            this.loading = false;
            // addon.log('loaded', this.graphNodes);
        },
        async collapseNode(node: Highcharts.Point) {
            const id = parseInt((node as any).id);
            if (!this.loadedNodes[id] || id == this.thisID)
                return;
            this.loading = true;
            this.loadedNodes[id] = false;

            const point = this.graphNodes.find(n => n.id == id.toString())!,
                tree = this.cachedTree.find(id);
            if (tree) {
                for (const child of tree.children) {
                    await Zotero.Promise.delay(0);
                    child.traverse(data => this.removeNode(data));
                }
                tree.clear();
            }
            point.marker = this.getMarker(id, point.marker?.radius);  // 更新标记
            // addon.log('collapsed', JSON.parse(JSON.stringify(this.graphNodes)));

            ++this.refresh;
            this.loading = false;
        },
        removeNode(id?: number) {
            if (!id)
                return;
            this.loadedNodes[id] = false;
            this.visitedNodes.delete(id);
            this.graphNodes = this.graphNodes.filter(
                node => node.id != id.toString()
            );
            this.graphData = this.graphData.filter(edge => {
                // 删除相关边，并标记相关节点为未加载
                if (edge[0] == id.toString())
                    return this.loadedNodes[edge[1]] = false;
                if (edge[1] == id.toString())
                    return this.loadedNodes[edge[0]] = false;
                return true;
            });
        },
        createNode(item: Zotero.Item) {
            this.visitedNodes.add(item.id);
            return {
                name: item.firstCreator,
                id: String(item.id),
                dataLabels: { enabled: true },
                marker: this.getMarker(item.id),
                custom: {
                    title: item.getField('title'),
                    time: new HistoryAnalyzer(item).totalS,
                },
            } as SeriesNetworkgraphNodesOptions;
        },
        getMarker(id: number, size: number = 8): PointMarkerOptionsObject {
            const relatedColor =
                this.loadedNodes[id] ? this.thatColor : this.dim(this.thatColor),
                isThis = id == this.thisID;
            return {
                symbol: isThis ? this.svgURL : 'circle',
                radius: size,
                width: size * 2,
                height: size * 2,
                fillColor: isThis ? this.thisColor : relatedColor,
                lineColor: isThis ? this.thisColor : this.thatColor,
                lineWidth: this.loadedNodes[id] ? 0 : 2,
            }
        },
        dim(color: string) {  // 降低颜色亮度
            return Highcharts.color(color).setOpacity(0.28).get() as string;
        },
        bfs(root: number) {
            this.cachedTree = new Tree(root);
            const queue = [this.cachedTree as Tree<number>],
                visited = new Set<number>([root]);

            while (queue.length) {
                const node = queue.shift()!;

                for (const edge of this.graphData)
                    if (edge.includes(node.data.toString())) {
                        const id = parseInt(edge[0]) + parseInt(edge[1]) - node.data;
                        if (visited.has(id))
                            continue;
                        visited.add(id);
                        node.appendChild(id);
                    }
                queue.push(...node.children);
            }
        },
        initGraph(id: number) {
            // 清空缓存并加载新的网络
            this.graphData = [];
            this.graphNodes = [];
            this.loadedNodes = {};
            this.visitedNodes.clear();
            this.cachedTree = new Tree(id);
            nodesLayout = {};
            ++this.refresh;
            this.loadNode(String(id));
        },
        updateGraph(newID: number, oldID?: number) {
            // 保存当前位置
            for (const node of nodesRef)
                nodesLayout[(node as any).id] = {
                    x: node.plotX,
                    y: node.plotY
                };
            this.restorePosition = true;

            // 更新缓存
            this.bfs(newID);

            // 更新当前节点
            for (const node of this.graphNodes)
                if (node.id == newID.toString() || node.id == oldID?.toString())
                    node.marker = this.getMarker(
                        (node as any).id,
                        node.marker?.radius
                    );
            ++this.refresh;
        }
    },
});
</script>
