<script lang="ts">
import type { Options } from 'highcharts';
import { Chart } from 'highcharts-vue';
import Highcharts from '@/highcharts';
import { helpMessageOption } from '@/utils';
export default {
    components: { Chart },
    props: {
        items: {
            type: Array<Zotero.Item>,
            required: true,
        },
        theme: Object,
    },
    data() {
        return { locale: addon.locale, isDark: false };
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
                exporting: { menuItemDefinitions: helpMessageOption(this.locale.doc.authorIF) },
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
    mounted() {
        const colorScheme = matchMedia('(prefers-color-scheme: dark)');
        this.isDark = colorScheme.matches;
        colorScheme.addEventListener('change', e => (this.isDark = e.matches));
    },
};
</script>

<template>
  <Chart :key="theme" :options="chartOpts" :class="{ 'highcharts-dark': isDark }" />
</template>
