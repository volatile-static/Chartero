<script lang="ts">
import type { Options } from 'highcharts';
import { Chart } from 'highcharts-vue';
import Highcharts from '@/highcharts';
export default {
    components: { Chart },
    data() {
        return { locale: addon.locale };
    },
    computed: {
        chartOpts() {
            const ifs: Record<string, number> = {},
                series = this.items
                    .map(it => {
                        const if5 =
                            addon.extraField.getExtraField(it, '影响因子') ??
                            addon.extraField.getExtraField(it, '5年影响因子');
                        if (!if5) return;
                        ifs[it.firstCreator] = parseFloat(if5) + (ifs[it.firstCreator] ?? 0);
                        return {
                            type: 'bar',
                            name: it.getField('title'),
                            data: [
                                {
                                    name: it.firstCreator,
                                    y: parseFloat(if5),
                                },
                            ],
                        } as Highcharts.SeriesBarOptions;
                    })
                    .filter(Boolean),
                categories = Object.keys(ifs).sort((a, b) => ifs[b] - ifs[a]);
            return {
                series,
                plotOptions: {
                    series: { stacking: 'normal' },
                },
                xAxis: {
                    type: 'category',
                    // categories
                },
                yAxis: {
                    title: { text: undefined },
                },
            } as Options;
        },
        options() {
            return Highcharts.merge(this.chartOpts, this.theme);
        },
    },
    props: {
        items: {
            type: Array<Zotero.Item>,
            required: true,
        },
        theme: Object,
    },
};
</script>

<template>
    <Chart :options="options" :key="theme"></Chart>
</template>

<style scoped></style>
