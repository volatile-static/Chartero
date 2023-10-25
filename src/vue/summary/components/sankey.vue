<script lang="ts">
import { Chart } from 'highcharts-vue';
import type {
    Options,
    SeriesSankeyOptions,
    SeriesSankeyPointOptionsObject,
    SeriesSankeyNodesOptionsObject,
    TooltipFormatterContextObject
} from 'highcharts';
import type { AttachmentHistory } from '$/history/history';
import { toTimeString } from '$/utils';
import HistoryAnalyzer from '$/history/analyzer';
import Highcharts from '@/highcharts';

interface ItemInfo {
    firstCreator: string;
    lastCreator: string;
    journal: string;
    itemID: number;
    totalSeconds: number;
}

function formatter(this: TooltipFormatterContextObject) {
    const Items = addon.getGlobal('Zotero').Items,
        items: ItemInfo[] | undefined = (this.point as any).custom?.items,
        colName = [addon.locale.firstCreator, addon.locale.lastCreator, addon.locale.journal],
        borderStyle = `border-left: 1px solid ${this.color}; border-top: solid ${this.color};`,
        breakStyle = 'white-space: normal;',
        tdStyle = `style='${borderStyle} ${breakStyle}'`,
        table = items?.map(it => {
            const title = Items.get(it.itemID).getField('title');
            return `<tr>
                <td ${tdStyle}>${title}</td>
                <td ${tdStyle}>${it.journal}</td>
                <td ${tdStyle}>${it.firstCreator}</td>
                <td ${tdStyle}>${it.lastCreator}</td>
                <td ${tdStyle}>${toTimeString(it.totalSeconds)}</td>
            </tr>`;
        }).join('');
    if (table)
        return `
            <table>
                <thead>
                    <tr>
                        <th>${addon.locale.itemTitle}</th>
                        <th>${addon.locale.journal}</th>
                        <th>${addon.locale.firstCreator}</th>
                        <th>${addon.locale.lastCreator}</th>
                        <th>${addon.locale.totalTime}</th>
                    </tr>
                </thead>
                <tbody>
                    ${table}
                </tbody>
            </table>
        `;
    else
        return `
            <span style='color: ${this.color}'>\u25CF </span>
            ${colName[(this.point as any).column]}:
            <b> ${this.point.name}</b>
        `;
}

export default {
    components: { Chart },
    data() {
        return { locale: addon.locale };
    },
    computed: {
        chartOpts() {
            const ha = new HistoryAnalyzer(this.history),
                parents = ha.parents.filter(it => it?.isRegularItem()) as Zotero.Item[],
                itemData = parents.map(item => {
                    const firstCreator = item.firstCreator,
                        lastCreatorData = item.getCreator(item.numCreators() - 1),
                        lastCreator = lastCreatorData && (
                            lastCreatorData.firstName!.length > 0
                                ? lastCreatorData.firstName + ' ' + lastCreatorData.lastName
                                : lastCreatorData.lastName
                        ),
                        journal = item.getField('journalAbbreviation')
                            || item.getField('publicationTitle')
                            || item.getField('conferenceName')
                            || item.getField('university'),
                        totalSeconds = new HistoryAnalyzer(item).totalS;
                    return { itemID: item.id, firstCreator, lastCreator, journal, totalSeconds };
                }).filter(
                    it => it.firstCreator &&
                        it.lastCreator &&
                        it.journal &&
                        it.firstCreator !== it.lastCreator
                ) as Array<ItemInfo>,
                first2last: Record<string, ItemInfo[]> = {},
                last2journal: Record<string, ItemInfo[]> = {},
                data = new Array<SeriesSankeyPointOptionsObject>(),
                nodes = new Array<SeriesSankeyNodesOptionsObject>(),
                firstCreatorSet = new Set<string>(),
                lastCreatorSet = new Set<string>(),
                journalSet = new Set<string>(),
                colors: string[] = this.theme!.colors,
                colorMap: Record<string, string> = {};
            for (const item of itemData) {
                const first_last = item.firstCreator + '\n' + item.lastCreator,
                    last_journal = item.lastCreator + '\n' + item.journal,
                    f2l = first2last[first_last] ??= new Array<ItemInfo>(),
                    l2j = last2journal[last_journal] ??= new Array<ItemInfo>();
                f2l.push(item);
                l2j.push(item);
                firstCreatorSet.add(item.firstCreator);
                lastCreatorSet.add(item.lastCreator);
                journalSet.add(item.journal);
            }
            let colorCnt = 0;
            // 首先分配通讯作者的颜色
            for (const lastCreator of lastCreatorSet) {
                colorMap[lastCreator] = colors[colorCnt];
                nodes.push({ id: lastCreator, column: 1, color: colors[colorCnt] });
                ++colorCnt;
                colorCnt %= 10;
            }
            // 然后根据通讯的颜色分配条目的颜色
            for (const [key, val] of [
                ...Object.entries(first2last),
                ...Object.entries(last2journal)
            ]) {
                const [from, to] = key.split('\n'),
                    col = first2last[key] ? 0 : 1;  // powered by GitHub Copilot
                data.push({
                    from,
                    to,
                    weight: val.length,
                    color: colorMap[col ? from : to],
                    custom: {
                        itemIDs: val.map(it => it.itemID),
                        items: val
                    }
                });
            }

            // 最后根据条目颜色合成其他结点颜色
            function mixColors(items: Array<[string, ItemInfo[]]>) {
                const colors = items.flatMap(
                    ([_, val]) => val.map(i => Highcharts.color(colorMap[i.lastCreator]))
                );
                let mixedColor = colors[0];
                for (let i = 1; i < colors.length; ++i)
                    mixedColor = Highcharts.color(
                        mixedColor.tweenTo(colors[i], 1 / colors.length)
                    );
                return mixedColor.get();
            }
            for (const firstCreator of firstCreatorSet) {
                const color = mixColors(Object.entries(first2last).filter(
                    ([key, _]) => key.startsWith(firstCreator)
                ));
                nodes.push({ id: firstCreator, column: 0, color });
            }
            for (const journal of journalSet) {
                const color = mixColors(Object.entries(last2journal).filter(
                    ([key, _]) => key.endsWith(journal)
                ));
                nodes.push({ id: journal, column: 2, color });
            }
            const maxRows = Math.max(
                ...[0, 1, 2].map(col => nodes.filter(n => n.column === col).length)
            );
            return {
                chart: { animation: undefined, height: maxRows * 26 + 50 },
                subtitle: { text: this.locale.chartTitle.sankey },
                tooltip: { useHTML: true, outside: true, formatter },
                series: [{
                    type: 'sankey',
                    data,
                    nodes
                } as SeriesSankeyOptions],
            } as Options;
        },
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
};
</script>

<template>
    <Chart :options="options" :key="theme"></Chart>
</template>