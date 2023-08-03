<template>
    <Chart :options="options" :key="theme"></Chart>
</template>

<script lang="ts">
import { Chart } from 'highcharts-vue';
import { defineComponent, type PropType } from 'vue';
import type { AttachmentHistory } from '@/utility/history';
import Highcharts from '@/utility/highcharts';
import HistoryAnalyzer from '@/utility/history';
import { toTimeString } from '@/utility/utils';

type GraphData = Array<[from: number, to: number]>;

export default defineComponent({
    components: { Chart },
    computed: {
        options() {
            return Highcharts.merge(this.chartOpts, this.theme);
        },
        chartOpts() {
            if (!this.topLevel) return {};

            const nodes: { [key: string]: boolean } = {},
                edges: { [edge: string]: boolean } = {},
                nodeItem: { [key: string]: Zotero.DataObject } = {},
                data: GraphData = [],
                top = this.topLevel;

            function dfs(it: Zotero.Item) {
                nodes[it.key] = true; // 访问该节点
                for (const key of it.relatedItems) {
                    const t = addon
                        .getGlobal('Zotero')
                        .Items.getByLibraryAndKey(top.libraryID, key);
                    if (!t) continue;
                    nodeItem[key] ??= t;
                    if (!edges[`${t.id},${it.id}`]) data.push([it.id, t.id]); // 已经有反向边了
                    edges[`${it.id},${t.id}`] = true; // 加边
                    if (!nodes[key]) dfs(t as Zotero.Item); // 递归
                }
            }
            dfs(top);
            const items = Object.values(nodeItem) as Zotero.Item[];

            return {
                plotOptions: {
                    networkgraph: {
                        layoutAlgorithm: {
                            enableSimulation: true,
                            initialPositions: 'random',
                        },
                    },
                },
                tooltip: {
                    formatter: function () {
                        return `
                            <b>${(this.point as any).custom.title}</b><br>
                            <span>${addon.locale.time}: ${toTimeString(
                            (this.point as any).custom.time
                        )}</span>`;
                    },
                },
                series: [
                    {
                        type: 'networkgraph',
                        data,
                        nodes: items.map(it => {
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
                            };
                        }),
                    } as Highcharts.SeriesNetworkgraphOptions,
                ],
            } as Highcharts.Options;
        },
    },
    props: { topLevel: Object as PropType<Zotero.Item>, theme: Object },
});
</script>
