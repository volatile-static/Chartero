<script lang="ts">
import type {
    Options,
    SeriesGanttOptions,
    GanttPointOptionsObject,
    YAxisOptions,
    NavigatorYAxisOptions,
    Point,
} from 'highcharts';
import { FilterIcon, SwapIcon } from 'tdesign-icons-vue-next';
import { Chart } from 'highcharts-vue';
import { defineComponent } from 'vue';
import { helpMessageOption } from '@/utils';
import Highcharts from '@/highcharts';
import HistoryAnalyzer from '$/history/analyzer';
import type { AttachmentHistory } from '$/history/history';
import { toTimeString } from '$/utils';

interface GanttItem extends GanttPointOptionsObject {
    start: number;
    end: number;
    completed: number;
    custom: { totalS: number; author?: string };
}
let rawData: GanttItem[] = [];

function sortData(opt: string, data: GanttItem[]): GanttItem[] {
    return data.sort((a, b) => {
        switch (opt) {
            case 'startAscending':
                return a.start - b.start;
            case 'startDescending':
                return b.start - a.start;
            case 'endAscending':
                return a.end - b.end;
            case 'endDescending':
                return b.end - a.end;
            case 'timeAscending':
                return a.custom.totalS - b.custom.totalS;
            case 'timeDescending':
                return b.custom.totalS - a.custom.totalS;
            default:
                return 0;
        }
    });
}
function filterData(opts: string[], data: GanttItem[]): GanttItem[] {
    const now = new Date(); // 时间选项不会同时出现，所以放在循环外
    return data.filter(point =>
        opts.every(opt => {
            switch (opt) {
                case 'completed':
                    return point.completed > 0.99;
                case 'incomplete':
                    return point.completed < 1.0;

                case 'month':
                    now.setMonth(now.getMonth() - 1);
                    return point.end > now.getTime();
                case 'week':
                    now.setDate(now.getDate() - 7);
                    return point.end > now.getTime();
                case 'day':
                    now.setDate(now.getDate() - 1);
                    return point.end > now.getTime();

                case 'fit':
                default:
                    return true;
            }
        }),
    );
}

function pointFormatter(this: Point) {
    const data = this.options as GanttItem,
        startDate = new Date(data.start).toLocaleDateString(),
        endDate = new Date(data.end).toLocaleDateString(),
        totalS = toTimeString(data.custom.totalS);
    return `
        <b> ${data.name}</b><br/>
        <b>${addon.locale.author}: </b>${data.custom.author}
        <b>  ${addon.locale.time}: </b>${totalS}<br/>
        ${startDate} ~ ${endDate}
    `;
}

const colTitleOpt = {
        title: { text: addon.locale.fileName },
        labels: { format: '{point.name}' },
    },
    colAuthorOpt = {
        title: { text: addon.locale.author },
        labels: { format: '{point.custom.author}' },
    };

export default defineComponent({
    components: { Chart, FilterIcon, SwapIcon },
    props: {
        history: {
            type: Array<AttachmentHistory>,
            required: true,
        },
        theme: Object,
    },
    data() {
        return {
            chartOpts: {
                exporting: {
                    menuItemDefinitions: helpMessageOption(addon.locale.doc.gantt),
                },
                chart: { zooming: { type: undefined } },
                navigator: {
                    enabled: true,
                    yAxis: { reversed: true, min: 0, max: 1 },
                },
                // rangeSelector: { enabled: true },
                scrollbar: { enabled: true, liveRedraw: true },
                xAxis: { tickPixelInterval: 100 },
                yAxis: {
                    visible: window.innerWidth > 500,
                    type: 'category',
                    grid: { enabled: true, columns: [colTitleOpt] },
                },
                tooltip: {
                    headerFormat: `<span style="color: {point.color}">\u25CF</span>`,
                    pointFormatter,
                },
                series: [
                    {
                        type: 'gantt',
                        minPointLength: 8,
                        data: [],
                    } as SeriesGanttOptions,
                ],
            } as Options,
            locale: addon.locale,
            sortOption: '',
            filterOption: new Array<string>(),
            titleOption: ['title'],
            isLandscape: window.innerWidth > 500,
            onResizeDebounced: Zotero.Utilities.debounce(this.onResize, 100) as () => void,
            reloadChart: 0,
            noHistoryFound: true,
        };
    },
    computed: {
        options() {
            ++this.reloadChart;
            return Highcharts.merge(this.chartOpts, this.theme);
        },
        seriesData: {
            get(): GanttItem[] {
                return (this.chartOpts.series![0] as SeriesGanttOptions).data as GanttItem[];
            },
            set(data: GanttItem[]) {
                data.forEach((point, i) => (point.y = i));
                (this.chartOpts.series![0] as SeriesGanttOptions).data = data;
                ++this.reloadChart;
            },
        },
    },
    watch: {
        sortOption(opt) {
            this.seriesData = sortData(opt, this.seriesData);
        },
        filterOption(opt) {
            this.seriesData = sortData(this.sortOption, filterData(opt, rawData));
            (this.chartOpts.navigator!.yAxis as NavigatorYAxisOptions).max = this.seriesData.length - 1;
            ++this.reloadChart;
        },
        titleOption(opt) {
            const col = (this.chartOpts.yAxis as YAxisOptions).grid!.columns!;
            col.length = 0;
            if (opt.includes('title')) col.push(colTitleOpt);
            if (opt.includes('author')) col.push(colAuthorOpt);
        },
        history(his: AttachmentHistory[]) {
            this.updateChart(his);
        },
    },
    beforeUnmount() {
        window.removeEventListener('resize', this.onResizeDebounced);
    },
    mounted() {
        this.updateChart(this.history);
        window.addEventListener('resize', this.onResizeDebounced);
    },
    methods: {
        updateChart(his: AttachmentHistory[]) {
            rawData = his
                .map(attHis => {
                    const ha = new HistoryAnalyzer([attHis]);
                    return {
                        name: ha.titles[0],
                        start: (attHis.record.firstTime ?? 0) * 1000,
                        end: (attHis.record.lastTime ?? 0) * 1000,
                        completed: ha.progress / 100,
                        id: ha.ids[0],
                        custom: {
                            totalS: attHis.record.totalS,
                            author: ha.parents[0]?.firstCreator,
                        },
                    } as GanttItem;
                })
                .filter(point => point.start! + point.end! > 0);
            this.noHistoryFound = rawData.length < 1;

            this.seriesData = sortData(this.sortOption, filterData(this.filterOption, rawData));
            (this.chartOpts.navigator!.yAxis as NavigatorYAxisOptions).max = this.seriesData.length - 1;
        },
        onResize() {
            (this.chartOpts.yAxis as YAxisOptions).visible = this.isLandscape = window.innerWidth > 500;
        },
    },
});
</script>

<template>
  <div>
    <h1 v-if="noHistoryFound" class="center-label">
      {{ locale.noHistoryFound }}
    </h1>
    <t-space v-else direction="vertical" style="width: 100%">
      <t-space style="padding: 8px" break-line>
        <t-select
          v-if="isLandscape"
          v-model="titleOption"
          :placeholder="locale.tableHeader"
          size="small"
          multiple
          clearable
          auto-width
        >
          <t-option value="title" :label="locale.ganttMenu.showTitle" />
          <t-option value="author" :label="locale.ganttMenu.showAuthor" />
        </t-select>
        <t-select v-else disabled auto-width size="small" :placeholder="locale.tableHeaderTip" />
        <t-select v-model="sortOption" :placeholder="locale.sort" size="small" auto-width>
          <template #prefixIcon>
            <SwapIcon style="transform: rotate(90deg)" />
          </template>
          <t-option value="startAscending" :label="locale.ganttMenu.startAscending" />
          <t-option value="startDescending" :label="locale.ganttMenu.startDescending" />
          <t-option value="endAscending" :label="locale.ganttMenu.endAscending" />
          <t-option value="endDescending" :label="locale.ganttMenu.endDescending" />
          <t-option value="timeAscending" :label="locale.ganttMenu.timeAscending" />
          <t-option value="timeDescending" :label="locale.ganttMenu.timeDescending" />
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
          />
          <t-option
            value="incomplete"
            :label="locale.ganttMenu.incomplete"
            :disabled="filterOption.includes('completed')"
          />
          <t-option
            value="month"
            :label="locale.ganttMenu.month"
            :disabled="filterOption.some(val => ['week', 'day'].includes(val))"
          />
          <t-option
            value="week"
            :label="locale.ganttMenu.week"
            :disabled="filterOption.some(val => ['month', 'day'].includes(val))"
          />
          <t-option
            value="day"
            :label="locale.ganttMenu.day"
            :disabled="filterOption.some(val => ['month', 'week'].includes(val))"
          />
          <!-- <t-option
                        value="fit"
                        :label="locale.ganttMenu.fitLength"
                    ></t-option> -->
        </t-select>
      </t-space>

      <Chart
        :key="reloadChart"
        ref="chart"
        constructor-type="ganttChart"
        :options="options"
        style="width: 100%"
      />
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
