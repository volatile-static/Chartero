<script lang="ts">
import type { Options } from 'highcharts';
import { Chart } from 'highcharts-vue';
import Highcharts from '@/highcharts';
export default {
    components: { Chart },
    data() {
        return { locale: addon.locale, isDark: false };
    },
    mounted() {
        const colorScheme = matchMedia('(prefers-color-scheme: dark)');
        this.isDark = colorScheme.matches;
        colorScheme.addEventListener('change', (e) => this.isDark = e.matches);
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
                chart: { styledMode: true },
                series,
                plotOptions: {
                    series: { stacking: 'normal', dataLabels: { enabled: true } },
                },
                xAxis: { type: 'category' },
                yAxis: { title: { text: undefined } },
            } as Options;
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
    <Chart :options="chartOpts" :key="theme" :class="{ 'highcharts-dark': isDark }"></Chart>
</template>
