<script lang="ts">
import type { AttachmentHistory } from 'zotero-reading-history';
import { Chart } from 'highcharts-vue';
import { defineComponent } from 'vue';
import Highcharts from '../../utility/highcharts';

export default defineComponent({
    data() {
        return {
            chartOpts: {
                navigator: {
                    enabled: true,
                    liveRedraw: true,
                },
                yAxis: { labels: { overflow: 'allow' } },
                rangeSelector: { enabled: true },
                plotOptions: { series: { minPointLength: 5 } },
                series: [
                    {
                        type: 'gantt',
                        data: [],
                    } as Highcharts.SeriesGanttOptions,
                ],
            } as Highcharts.Options,
            locale: toolkit.locale,
            sortOption: '',
            filterOption: new Array<string>(),
        };
    },
    watch: {
        sortOption(opt) {
            toolkit.log(opt);
        },
        filterOption(opt) {
            toolkit.log(opt);
        },
        history(his: AttachmentHistory[]) {
            this.updateChart(his);
        },
    },
    methods: {
        updateChart(his: AttachmentHistory[]) {
            if (his.length < 1) return;
            (this.chartOpts.series![0] as Highcharts.SeriesGanttOptions).data =
                his
                    .map(attHis => {
                        const ha = new toolkit.HistoryAnalyzer([attHis]);
                        return {
                            name: ha.titles[0],
                            start: (attHis.record.firstTime ?? 0) * 1000,
                            end: (attHis.record.lastTime ?? 0) * 1000,
                            completed: ha.progress / 100,
                        } as Highcharts.GanttPointOptionsObject;
                    })
                    .filter(point => point.start! + point.end! > 0);
        },
    },
    computed: {
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
    mounted() {
        this.updateChart(this.history);
    },
    components: { Chart },
});
</script>

<template>
    <p v-if="history.length < 1" class="center-label">
        {{ locale.noHistoryFound }}
    </p>
    <t-space v-else direction="vertical">
        <t-space style="padding: 8px" break-line>
            <t-select
                v-model="sortOption"
                :placeholder="locale.sort"
                size="small"
                auto-width
            >
                <t-option
                    value="startAscending"
                    :label="locale.ganttMenu.startAscending"
                ></t-option>
                <t-option
                    value="startDescending"
                    :label="locale.ganttMenu.startDescending"
                ></t-option>
                <t-option
                    value="endAscending"
                    :label="locale.ganttMenu.endAscending"
                ></t-option>
                <t-option
                    value="endDescending"
                    :label="locale.ganttMenu.endDescending"
                ></t-option>
            </t-select>
            <t-select
                v-model="filterOption"
                :placeholder="locale.filter"
                size="small"
                multiple
                clearable
                auto-width
            >
                <t-option
                    value="completed"
                    :label="locale.ganttMenu.completed"
                    :disabled="filterOption.includes('incomplete')"
                ></t-option>
                <t-option
                    value="incomplete"
                    :label="locale.ganttMenu.incomplete"
                    :disabled="filterOption.includes('completed')"
                ></t-option>
                <t-option
                    value="month"
                    :label="locale.ganttMenu.month"
                    :disabled="
                        filterOption.some(val => ['week', 'day'].includes(val))
                    "
                ></t-option>
                <t-option
                    value="week"
                    :label="locale.ganttMenu.week"
                    :disabled="
                        filterOption.some(val => ['month', 'day'].includes(val))
                    "
                ></t-option>
                <t-option
                    value="day"
                    :label="locale.ganttMenu.day"
                    :disabled="
                        filterOption.some(val =>
                            ['month', 'week'].includes(val)
                        )
                    "
                ></t-option>
                <t-option
                    value="fit"
                    :label="locale.ganttMenu.fitLength"
                ></t-option>
            </t-select>
        </t-space>

        <Chart
            constructor-type="ganttChart"
            :options="options"
            :key="theme"
        ></Chart>
    </t-space>
</template>

<style scoped>
.center-label {
    text-align: center;
    position: relative;
    top: 38%;
}
</style>
