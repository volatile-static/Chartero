<script lang="ts">
import type {
    Options,
    SeriesGanttOptions,
    GanttPointOptionsObject,
    YAxisOptions,
    NavigatorYAxisOptions,
    Point,
    XAxisOptions,
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
function addParentData(data: GanttItem[]): GanttItem[] {
    let parentIds = new Set<string>();
    // 遍历找到共同父条目的附件
    for (let i = 0; i < data.length; ++i)
        for (let j = i + 1; j < data.length; ++j) {
            const pi = Zotero.Items.get(data[i].id!).parentID,
                pj = Zotero.Items.get(data[j].id!).parentID;
            if (pi === pj) {
                parentIds.add(String(pi));
                data[i].parent = data[j].parent = String(pi);
            }
        }
    // 添加父条目
    for (const id of parentIds) {
        const it = Zotero.Items.get(id), ha = new HistoryAnalyzer(it);
        data.push({
            id: String(id),
            name: it.getField('title'),
            start: ha.firstTime * 1000,
            end: ha.lastTime * 1000,
            completed: ha.progress / 100,
            custom: { totalS: ha.totalS, author: it.firstCreator },
        });
    }
    // 替换顶层条目名为父条目标题
    for (const d of data)
        if (!d.parent) {
            const it = Zotero.Items.get(d.id!);
            d.name = (it.parentItem ?? it).getField('title');
        }
    return data;
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
                    handles: { width: 16 }
                },
                // rangeSelector: { enabled: true },
                scrollbar: { enabled: true, liveRedraw: true },
                xAxis: {
                    dateTimeLabelFormats: {
                        year: '%[Y]',
                        month: {
                            list: ['%[yB]', '%[b]'],
                            main: {},
                        },
                        week: {
                            list: ['%Y | W%W', 'Week%W', 'W%W'],
                            main: {},
                        },
                        day: {
                            list: ['%[YBe]', '%[be]', '%[a]', '%e'],
                            main: {},
                        },
                        hour: {
                            list: ['%[YBeH]', '%[beH]', '%[H]'],
                            main: {}
                        },
                        minute: {
                            list: ['%[YBe] %H:%M', '%[be] %H:%M', '%H:%M'],
                            main: {},
                        },
                        second: {
                            list: ['%H:%M:%S', '%H:%M'],
                            main: {},
                        },
                    }
                },
                yAxis: {
                    visible: window.innerWidth > 500,
                    // type: 'category',
                    // grid: { enabled: true, columns: [colTitleOpt] },
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
            noHistoryFound: true,
        };
    },
    computed: {
        options() {
            const opts: Options = Highcharts.merge(this.chartOpts, this.theme),
                xAxis = opts.xAxis as XAxisOptions;
            opts.xAxis = [xAxis, xAxis];
            return opts;
        },
        seriesData: {
            get(): GanttItem[] {
                return (this.chartOpts.series![0] as SeriesGanttOptions).data as GanttItem[];
            },
            set(data: GanttItem[]) {
                data.forEach((point, i) => (point.y = i));
                (this.chartOpts.series![0] as SeriesGanttOptions).data = data;
            },
        },
    },
    watch: {
        sortOption(opt) {
            this.seriesData = sortData(opt, this.seriesData);
        },
        filterOption(opt) {
            this.updateSeriesData(this.sortOption, opt);
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
        updateSeriesData(sortOption: string, filterOption: string[]) {
            this.seriesData = sortData(
                sortOption,
                addParentData(filterData(filterOption, rawData))
            );
            (this.chartOpts.navigator!.yAxis as NavigatorYAxisOptions).max = this.seriesData.length - 1;
        },
        updateChart(his: AttachmentHistory[]) {
            rawData = his
                .map(attHis => {
                    const ha = new HistoryAnalyzer(attHis);
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
            this.updateSeriesData(this.sortOption, this.filterOption);
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
        :key="JSON.stringify(theme)"
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
