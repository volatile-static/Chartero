<script setup lang="ts">
import { FilterIcon } from 'tdesign-icons-vue-next';
</script>
<script lang="ts">
import type {
    Options,
    SeriesGanttOptions,
    GanttPointOptionsObject,
    YAxisOptions,
    NavigatorYAxisOptions,
    GanttChart,
} from 'highcharts';
import type { AttachmentHistory } from 'zotero-reading-history';
import { Chart } from 'highcharts-vue';
import { defineComponent } from 'vue';
import Highcharts from '@/utility/highcharts';

export default defineComponent({
    data() {
        return {
            chartOpts: {
                chart: { zooming: { type: undefined } },
                navigator: {
                    enabled: true,
                    yAxis: { reversed: true, min: 0, max: 1 },
                },
                rangeSelector: { enabled: true },
                scrollbar: { enabled: true, liveRedraw: true },
                yAxis: { visible: window.innerWidth > 500 },
                series: [
                    {
                        type: 'gantt',
                        minPointLength: 8,
                        data: [],
                    } as SeriesGanttOptions,
                ],
            } as Options,
            locale: toolkit.locale,
            sortOption: '',
            filterOption: new Array<string>(),
            titleOption: ['title'],
            isLandscape: window.innerWidth > 500,
            onResizeDebounced: toolkit
                .getGlobal('Zotero')
                .Utilities.debounce(this.onResize, 100) as () => void,
        };
    },
    watch: {
        sortOption(opt) {
            toolkit.log(opt);
        },
        filterOption(opt) {
            toolkit.log(opt);
        },
        titleOption(opt) {
            toolkit.log(opt);
        },
        history(his: AttachmentHistory[]) {
            this.updateChart(his);
        },
    },
    methods: {
        updateChart(his: AttachmentHistory[]) {
            if (his.length < 1) return;
            this.seriesData = his
                .map(attHis => {
                    const ha = new toolkit.HistoryAnalyzer([attHis]);
                    return {
                        name: ha.titles[0],
                        start: (attHis.record.firstTime ?? 0) * 1000,
                        end: (attHis.record.lastTime ?? 0) * 1000,
                        completed: ha.progress / 100,
                        id: ha.ids[0],
                    } as GanttPointOptionsObject;
                })
                .filter(point => point.start! + point.end! > 0);
            (this.chartOpts.navigator!.yAxis as NavigatorYAxisOptions).max =
                this.seriesData.length - 1;
        },
        onResize() {
            (this.chartOpts.yAxis as YAxisOptions).visible = this.isLandscape =
                window.innerWidth > 500;
        },
    },
    computed: {
        options() {
            return Highcharts.merge(this.chartOpts, this.theme);
        },
        seriesData: {
            get() {
                return (this.chartOpts.series![0] as SeriesGanttOptions).data!;
            },
            set(data: GanttPointOptionsObject[]) {
                (this.chartOpts.series![0] as SeriesGanttOptions).data = data;
            },
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
        window.addEventListener('resize', this.onResizeDebounced);
    },
    beforeUnmount() {
        window.removeEventListener('resize', this.onResizeDebounced);
    },
    components: { Chart },
});
</script>

<template>
    <div>
        <h1 v-if="seriesData.length < 1" class="center-label">
            {{ locale.noHistoryFound }}
        </h1>
        <t-space v-else direction="vertical" style="width: 100%">
            <t-space style="padding: 8px" break-line>
                <t-select
                    v-if="isLandscape"
                    :placeholder="locale.tableHeader"
                    v-model="titleOption"
                    size="small"
                    multiple
                    clearable
                    auto-width
                >
                    <t-option value="title" :label="locale.ganttMenu.showTitle">
                    </t-option>
                    <t-option
                        value="author"
                        :label="locale.ganttMenu.showAuthor"
                    >
                    </t-option>
                </t-select>
                <t-select
                    v-else
                    disabled
                    size="small"
                    :placeholder="locale.tableHeaderTip"
                ></t-select>
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
                    <template #prefixIcon>
                        <FilterIcon />
                    </template>
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
                            filterOption.some(val =>
                                ['week', 'day'].includes(val)
                            )
                        "
                    ></t-option>
                    <t-option
                        value="week"
                        :label="locale.ganttMenu.week"
                        :disabled="
                            filterOption.some(val =>
                                ['month', 'day'].includes(val)
                            )
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
                :key="options"
                ref="chart"
                style="width: 100%"
            ></Chart>
        </t-space>
    </div>
</template>

<style scoped>
.center-label {
    text-align: center;
    position: relative;
    top: 38%;
}
</style>
