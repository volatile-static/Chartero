<script lang="ts">
import { nextTick } from 'vue';
import { Chart } from 'highcharts-vue';
import Highcharts from '@/highcharts';
import type {
    Options,
    PointOptionsObject,
    SeriesNetworkgraphNodesOptions,
    SeriesNetworkgraphOptions,
} from 'highcharts';
export default {
    components: { Chart },
    props: {
        history: {
            type: Array<Zotero.Item>,
            required: true,
        },
        theme: Object,
    },
    data() {
        return {
            locale: addon.locale,
            progress: 1,
            cancelToken: { cancelled: false }, // 用于取消上一次未完成的异步操作
            seriesData: [] as PointOptionsObject[],
            seriesNode: [] as SeriesNetworkgraphNodesOptions[],
        };
    },
    computed: {
        chartOpts() {
            return {
                tooltip: { format: '{point.name}' },
                series: [
                    {
                        type: 'networkgraph',
                        data: this.seriesData,
                        nodes: this.seriesNode,
                        layoutAlgorithm: {
                            enableSimulation: true,
                            linkLength: Math.min(innerHeight, innerWidth) / 8,
                        },
                        dataLabels: {
                            enabled: true,
                            linkTextPath: { attributes: { dy: 3.5 } },
                            linkFormat: '>',
                        },
                    } as SeriesNetworkgraphOptions,
                ],
            } as Options;
        },
        options() {
            return Highcharts.merge(this.chartOpts, this.theme);
        },
        percentage() {
            return parseFloat((this.progress * 100).toFixed(2));
        },
        caches(): Record<string, PointOptionsObject[]> {
            const prefs = Zotero.Prefs.get('chartero.referencesCache');
            if (!prefs) return {};
            try {
                return JSON.parse(prefs as string);
            } catch (error) {
                return {};
            }
        },
    },
    watch: {
        history() {
            // 初始化状态
            this.seriesNode = [];
            this.seriesData = [];
            this.cancelToken.cancelled = true;

            nextTick(this.doProcess);
        },
        theme() {
            // 更新结点图标
            this.seriesNode = this.seriesNode.map(n => {
                const it = Zotero.Items.get(Number(n.id));
                n.marker!.symbol = `url(${it.getImageSrc()})`;
                return n;
            });
        },
    },
    mounted() {
        this.doProcess();
    },
    methods: {
        async processReferenceNetwork(cancelToken?: { cancelled: boolean }) {
            async function getAttachmentText(att: Zotero.Item) {
                if (cancelToken?.cancelled) return ''; // 取消执行当前promise
                const path = await att.getFilePathAsync(),
                    text = path && await addon.worker.query('processPDF', path);
                console.info(text)
                return text && (text as any).text;
                // if (__test__) return att.attachmentText; // 测试环境不处理异常
                // return att.attachmentText.catch(e => {
                //     if (e.name == 'InvalidPDFException') addon.log(`Invalid PDF: ${att.getField('title')}`);
                //     else addon.log(e, att);
                // });
            }
            // 进度条
            const chartRef = (this.$refs.chartRef as Chart)?.chart;
            chartRef.showLoading();
            this.progress = 0;

            // 从缓存中读取
            const cacheKey = this.history.map(it => it.id).join(','),
                caches = this.caches;
            if (cacheKey in caches) {
                // 缓存命中
                this.seriesData = caches[cacheKey];
                // addon.log(`Found ${cacheKey} in cache`, [...this.seriesData]);
            } else {
                // 缓存未命中
                const promiseList = this.history.map(async (it, index, { length }) => {
                        const attachments = Zotero.Items.get(it.getAttachments()),
                            attText = await Promise.all(attachments.map(getAttachmentText));
                        if (cancelToken?.cancelled) return '';

                        // 刷新进度条
                        this.progress = (index + 1) / (length + 1);
                        chartRef.showLoading(it.getField('title'));

                        return attText.filter(Boolean).join('\n'); // 连接所有附件的全文
                    }),
                    textList = await Promise.all(promiseList);
                if (cancelToken?.cancelled) return; // 取消执行当前promise

                for (let i = 0; i < textList.length; ++i)
                    for (let j = i + 1; j < textList.length; ++j)
                        if (textList[i].includes(this.history[j].getField('title'))) {
                            // 如果i引用了j
                            addon.log(`Found ${this.history[j].id} cited by ${this.history[i].id}`);
                            this.seriesData.push([this.history[i].id, this.history[j].id].map(String));
                        }

                // 缓存结果
                caches[cacheKey] = this.seriesData;
                let prefs = JSON.stringify(caches);
                if (prefs.length > 1024 * 1024) prefs = JSON.stringify({}); // 超过1MB的缓存清空
                addon.log(`Save ${cacheKey} to cache, size:`, prefs.length);
                Zotero.Prefs.set('chartero.referencesCache', prefs);
            }
            this.seriesNode = [...new Set(this.seriesData.flat())] // 所有结点
                .map(id => Zotero.Items.get(Number(id)))
                .map((it, _, { length }) => {
                    const size = ((innerHeight * innerWidth) / length) ** 0.5 / 6;
                    return {
                        id: it.id.toString(),
                        name: it.getField('title'),
                        dataLabels: { format: it.firstCreator },
                        marker: {
                            symbol: `url(${it.getImageSrc()})`,
                            height: size,
                            width: size, // 结点面积 ∝ 屏幕面积 / 结点数量
                            // radius: size / 2,
                        },
                    } as SeriesNetworkgraphNodesOptions;
                });
        },
        doProcess() {
            const ids = [...this.history.map(it => it.id)],
                cancelToken = { cancelled: false };
            this.cancelToken = cancelToken;
            this.processReferenceNetwork(cancelToken)
                .catch(e => addon.log(ids, e))
                .finally(() => {
                    // 隐藏进度条
                    (this.$refs.chartRef as Chart)?.chart.hideLoading();
                    this.progress = 1;
                });
        },
    },
};
</script>

<template>
  <Transition>
    <t-progress
      v-if="progress != 1"
      :percentage="percentage"
      status="active"
      theme="plump"
      class="progress"
    />
  </Transition>
  <Chart :key="options" ref="chartRef" :options="options" />
</template>

<style scoped>
.progress {
    margin: 8px;
    transition: all;
}

.v-enter-active,
.v-leave-active {
    transition: all 1.5s;
}

.v-enter-from,
.v-leave-to {
    opacity: 0;
    height: 0;
}
</style>
