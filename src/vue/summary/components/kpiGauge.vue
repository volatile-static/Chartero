<script lang="ts">
import type { Options } from 'highcharts';
import type { AttachmentHistory } from '$/history/history';
import { Chart } from 'highcharts-vue';
import Highcharts from '@/highcharts';
import HistoryAnalyzer from '$/history/analyzer';
export default {
    components: { Chart },
    props: {
        history: {
            type: Array<AttachmentHistory>,
            required: true,
        },
        itemsCount: {
            type: Number,
            required: true,
        },
        theme: Object,
    },
    data() {
        return {
            locale: addon.locale,
            isDark: false,
            trackColors: Highcharts.getOptions().colors!.map(color =>
                new Highcharts.Color(color).setOpacity(0.3).get(),
            ),
        };
    },
    computed: {
        chartOpts() {
            const ha = new HistoryAnalyzer(this.history);
            let finished = 0;
            for (const h of this.history)
                if (h.record.pageArr.length / (h.record.numPages ?? Infinity) >= 0.98) ++finished;
            console.debug(finished);
            return {
                title: { text: undefined },
                chart: { type: 'solidgauge', styledMode: false },
                tooltip: {
                    borderWidth: 0,
                    backgroundColor: 'none',
                    shadow: false,
                    style: { fontSize: '16px' },
                    valueSuffix: '%',
                    pointFormat:
                        '{series.name}<br>' +
                        '<span style="font-size: 2em; color: var(--highcharts-color-{point.colorIndex}); ' +
                        'font-weight: bold">{point.y}</span>',
                    positioner(labelWidth) {
                        return {
                            x: (this.chart.chartWidth - labelWidth) / 2,
                            y: this.chart.plotHeight / 2 - 25,
                        };
                    },
                },
                pane: {
                    startAngle: 0,
                    endAngle: 360,
                    background: [
                        {
                            // Track for Conversion
                            outerRadius: '112%',
                            innerRadius: '88%',
                            backgroundColor: this.trackColors[0],
                            borderWidth: 0,
                        },
                        {
                            // Track for Engagement
                            outerRadius: '87%',
                            innerRadius: '63%',
                            backgroundColor: this.trackColors[1],
                            borderWidth: 0,
                        },
                        {
                            // Track for Feedback
                            outerRadius: '62%',
                            innerRadius: '38%',
                            backgroundColor: this.trackColors[2],
                            borderWidth: 0,
                        },
                    ],
                },
                yAxis: {
                    min: 0,
                    max: 100,
                    lineWidth: 0,
                    tickPositions: [],
                },
                plotOptions: {
                    solidgauge: {
                        dataLabels: { enabled: false },
                        linecap: 'round',
                        stickyTracking: false,
                        rounded: true,
                    },
                },
                series: [
                    {
                        name: this.locale.gaugeSeries.item,
                        type: 'solidgauge',
                        data: [
                            {
                                color: Highcharts.getOptions().colors![0],
                                colorIndex: 0,
                                radius: '112%',
                                innerRadius: '88%',
                                y: parseFloat(((this.history.length / this.itemsCount) * 100).toFixed(2)),
                            },
                        ],
                    },
                    {
                        name: this.locale.gaugeSeries.page,
                        type: 'solidgauge',
                        data: [
                            {
                                color: Highcharts.getOptions().colors![1],
                                colorIndex: 3,
                                radius: '87%',
                                innerRadius: '63%',
                                y: ha.progress,
                            },
                        ],
                    },
                    {
                        name: this.locale.gaugeSeries.done,
                        type: 'solidgauge',
                        data: [
                            {
                                color: Highcharts.getOptions().colors![2],
                                colorIndex: 2,
                                radius: '62%',
                                innerRadius: '38%',
                                y: parseFloat(((finished / this.itemsCount) * 100).toFixed(2)),
                            },
                        ],
                    },
                ] as Highcharts.SeriesSolidgaugeOptions[],
            } as Options;
        },
        options() {
            return Highcharts.merge(this.chartOpts, this.theme);
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
  <Chart :key="theme" :options="options" :class="{ 'highcharts-dark': isDark }" />
</template>
