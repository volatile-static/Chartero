<script lang="ts">
import type { Options } from 'highcharts';
import { Chart } from 'highcharts-vue';
import Highcharts from '@/highcharts';
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
        return { locale: addon.locale };
    },
    computed: {
        chartOpts() {
            const q = [0, 0, 0, 0];
            for (const it of this.items) {
                const jcr = addon.extraField.getExtraField(it, 'JCR分区'),
                    match = jcr?.match(/\d/);
                if (match) ++q[parseInt(match[0]) - 1];
            }
            console.debug(q);
            if (q.every(v => v === 0)) return { series: [] };
            return {
                series: [
                    {
                        type: 'pie',
                        data: q.map((v, i) => ({ name: `Q${i + 1}`, y: v })),
                    } as Highcharts.SeriesPieOptions,
                ],
            } as Options;
        },
        options() {
            return Highcharts.merge(this.chartOpts, this.theme);
        },
    },
};
</script>

<template>
  <Chart :key="JSON.stringify(theme)" :options="options" />
</template>

<style scoped></style>
