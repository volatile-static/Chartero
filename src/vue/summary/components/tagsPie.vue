<script lang="ts">
import type { AttachmentHistory } from 'zotero-reading-history';
import Highcharts from '@/utility/highcharts';
import HistoryAnalyzer from '@/utility/history';
export default {
    data() {
        return {
            locale: toolkit.locale,
        };
    },
    computed: {
        chartOpts(): Highcharts.Options {
            const tagPieMap: { [name: string]: { rad: number; tim: number } } =
                {};
            for (const his of this.history) {
                const topLevel = new HistoryAnalyzer([his]).parents[0];
                if (!topLevel) continue;

                const tags = topLevel.getTags().map(tag => tag.tag),
                    time = his.record.totalS;
                for (const tag of tags) {
                    tagPieMap[tag] ??= { rad: 0, tim: 0 };
                    ++tagPieMap[tag].rad;
                    tagPieMap[tag].tim += time;
                }
            }
            let data = Object.keys(tagPieMap).map(tag => [
                    tag,
                    tagPieMap[tag].rad,
                    tagPieMap[tag].tim,
                ])
            //     others = [
            //         toolkit.locale.others,
            //         data.reduce(
            //             (prev, curr) =>
            //                 prev + Number(curr[1] == 1 && curr[2] == 0),
            //             0
            //         ),
            //         0,
            //     ];
            // toolkit.log(data, others);
            // data = data.filter(([, rad, tim]) => rad != 1 || tim != 0);
            // if (others[1] > 0) data.push(others);
            return {
                plotOptions: { variablepie: { allowPointSelect: true } },
                series: [
                    {
                        type: 'variablepie',
                        data,
                        innerSize: '20%',
                    } as Highcharts.SeriesVariablepieOptions,
                ],
            };
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
<script lang="ts" setup>
import { Chart } from 'highcharts-vue';
</script>

<template>
    <Chart :options="options" :key="theme"></Chart>
</template>

<style scoped></style>
