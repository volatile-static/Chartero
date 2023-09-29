<script lang="ts">
import type { Options, SeriesPieOptions } from 'highcharts';
import type { AttachmentHistory } from '$/history/history';
import { Chart } from 'highcharts-vue';
import Highcharts from '@/highcharts';
import HistoryAnalyzer from '$/history/analyzer';
export default {
    components: { Chart },
    data() {
        return { locale: addon.locale };
    },
    computed: {
        chartOpts() {
            const ha = new HistoryAnalyzer(this.history);
            return {
                series: this.history.map((his, idx) => ({
                    type: 'pie',
                    name: ha.titles[idx],
                    visible: idx === 0,
                    data: his.record.userIDs.map(id => ({
                        name: Zotero.Users.getName(id),
                        y: his.record.getUserTotalSeconds(id),
                    }))
                } as SeriesPieOptions)),
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
