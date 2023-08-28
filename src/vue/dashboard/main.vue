<template>
    <t-collapse :default-value="['progress', 'date']" :value="collapseValue" @change="onCollapseChange"
        expand-icon-placement="right">
        <t-collapse-panel value="progress" :header="locale.readingProgress">
            <t-space align="center" size="small" class="progress-space">
                <t-tooltip :content="locale.readingProgressTip" :show-arrow="false">
                    <t-progress theme="circle" size="small" :percentage="readingProgress" />
                </t-tooltip>
                <div class="progress-info">
                    <span>{{
                        `🔖 ${locale.progressLabel.read} ${readPages} ${locale.pages} / ${locale.progressLabel.total}
                                            ${numPages} ${locale.pages}`
                    }}</span>
                    <span>{{
                        `📚 ${numAttachment} ${locale.progressLabel.PDFs} / ${locale.progressLabel.total} ${attachmentSize}
                        MB`
                    }}</span>
                    <span>📝 {{ noteNum }} {{ locale.progressLabel.notes }} /
                        {{ locale.progressLabel.total }} {{ noteWords }}
                        {{ locale.progressLabel.words }}</span>
                </div>
                <template #separator>
                    <t-divider layout="vertical" />
                </template>
            </t-space>
        </t-collapse-panel>

        <!-- <t-collapse-panel value="bubble" :disabled="collapseDisabled">
            <ProgressBubble :history="itemHistory" :theme="chartTheme" />
        </t-collapse-panel> -->

        <t-collapse-panel value="page" :header="locale.chartTitle.pageTime" :disabled="collapseDisabled">
            <PageTime :history="itemHistory" :theme="chartTheme"></PageTime>
        </t-collapse-panel>

        <t-collapse-panel value="date" :header="locale.chartTitle.dateTime" :disabled="collapseDisabled">
            <DateTime :history="itemHistory" :theme="chartTheme"></DateTime>
        </t-collapse-panel>

        <t-collapse-panel value="network" :header="locale.chartTitle.network" :disabled="collapseDisabled">
            <Network :topLevel="topLevel" :theme="chartTheme" :key="topLevel?.id"></Network>
        </t-collapse-panel>

        <t-collapse-panel value="timeline" :header="locale.timeline" :disabled="collapseDisabled">
            <TimeLine :history="itemHistory"></TimeLine>
        </t-collapse-panel>
    </t-collapse>

    <!-- <div class="theme-button">
        <t-button @click="switchTheme" size="large" shape="circle">{{
            themeBtn
        }}</t-button>
    </div> -->
</template>

<script lang="ts">
import type { CollapseValue } from 'tdesign-vue-next';
import { nextTick } from 'vue';
import { GridLightTheme, DarkUnicaTheme } from '@/themes';
import PageTime from './components/pageTime.vue';
import DateTime from './components/dateTime.vue';
import TimeLine from './components/timeline.vue';
import Network from './components/network.vue';
import ProgressBubble from './components/progressBubble.vue';
import anime from 'animejs';
import HistoryAnalyzer from '$/history/analyzer';
import type { AttachmentHistory } from '$/history/history';

const Zotero = addon.getGlobal('Zotero');

export default {
    methods: {
        switchTheme() {
            this.dark = !this.dark;
            if (this.dark)
                document.documentElement.setAttribute('theme-mode', 'dark');
            else
                document.documentElement.removeAttribute('theme-mode');
            document
                .querySelectorAll('div.highcharts-data-table')
                .forEach(el => el.remove());
        },
        updateTheme() {
            if (addon.getPref('useDarkTheme') != this.dark)
                this.switchTheme();
        },
        onCollapseChange(val: CollapseValue) {
            this.collapseValue =
                this.itemHistory.length < 1 ? ['progress'] : val;
        },
        // 统计笔记信息
        updateNotes() {
            const noteIDs = this.topLevel?.getNotes(),
                notes = noteIDs?.map(id => Zotero.Items.get(id).getNote()),
                text = notes?.map(str => str.replace(/<[^<>]+>/g, '')).join('');
            anime({ ...this.animateInt, noteNum: noteIDs?.length ?? 0 });
            anime({
                ...this.animateInt,
                noteWords: text?.replace(/\s/g, '').length ?? 0,
            });
        },
        // 更新阅读进度
        async updateProgress() {
            const att = this.isReader
                ? this.item
                : await this.topLevel?.getBestAttachment(),
                his = att && addon.history.getByAttachment(att);
            if (his) {
                anime({ ...this.animateInt, readPages: his.record.readPages });
                anime({
                    ...this.animateInt,
                    numPages: his.record.numPages ?? 0,
                });
            }
        },
        // 统计附件大小
        updateSize() {
            const attachments = this.isReader
                ? [this.item]
                : this.topLevel
                    ?.getAttachments()
                    .map(id => Zotero.Items.get(id))
                    .filter(it => it.isFileAttachment()),
                files = attachments?.map(it => it!.getFilePath()),
                totalSize =
                    files?.reduce((size, file) => {
                        try {
                            return file
                                ? Zotero.File.pathToFile(file).fileSize + size
                                : size;
                        } catch (error) {
                            addon.log(error);
                            return size;
                        }
                    }, 0) ?? 0;
            anime({
                targets: this,
                attachmentSize: (totalSize / 1024 / 1024).toFixed(2),
                round: 100,
                duration: 260,
                easing: 'linear',
            });
            anime({
                ...this.animateInt,
                numAttachment: this.topLevel?.numNonHTMLFileAttachments() ?? 1, // 自己本身算一个
            });
        },
    },
    mounted() {
        window.addEventListener('message', e => {
            // 判断消息是否包含ID
            if (typeof e.data.id != 'number')
                return;
            this.item = Zotero.Items.get(e.data.id); // 获取传入的条目
            if (addon.getPref('enableRealTimeDashboard'))  // 强制刷新
                this.realtimeUpdating = !this.realtimeUpdating;
            this.updateTheme();
            nextTick(() => {
                this.updateNotes();
                this.updateProgress();
                this.updateSize();
            });
        });
    },
    computed: {
        readingProgress(): number {
            if (this.itemHistory.length < 1) return 0;
            const ha = new HistoryAnalyzer(this.itemHistory);
            return ha.progress;
        },
        chartTheme(): object {
            return this.dark ? DarkUnicaTheme : GridLightTheme;
        },
        themeBtn(): string {
            return this.dark ? '☀️' : '🌙';
        },
        collapseDisabled(): boolean {
            return this.itemHistory.length < 1;
        },
        /** 2 */
        topLevel(): Zotero.Item | undefined {
            return this.isReader
                ? this.item?.parentItem
                : this.item ?? undefined;
        },
        /** 1 */
        isReader(): boolean {
            return !this.item?.isRegularItem();
        },
        /** 3 */
        itemHistory(): AttachmentHistory[] {
            if (this.realtimeUpdating) {
                // no-op: 未更换条目时强制刷新历史记录
            }
            if (this.topLevel)
                return addon.history.getInTopLevelSync(this.topLevel);
            else {
                const his =
                    this.item && addon.history.getByAttachment(this.item);
                return his ? [his] : [];
            }
        },
    },
    watch: {
        collapseDisabled(val: boolean) {
            if (val) this.collapseValue = ['progress'];
        },
    },
    data() {
        return {
            dark: false,
            locale: addon.locale,
            noteNum: 0,
            noteWords: 0,
            readPages: 0,
            numPages: 0,
            numAttachment: 0,
            attachmentSize: '',
            collapseValue: ['progress'] as Array<string | number>,
            item: null as null | Zotero.Item,
            animateInt: {
                round: 1,
                duration: 260,
                targets: this,
            } as anime.AnimeParams,
            realtimeUpdating: false,
        };
    },
    components: { PageTime, DateTime, TimeLine, Network, ProgressBubble },
};
</script>

<style scoped>
.progress-info {
    justify-content: center;
    align-content: center;
    display: flex;
    flex-direction: column;
}

.progress-info span {
    text-overflow: ellipsis;
    white-space: nowrap;
    overflow: hidden;
}

.progress-space {
    margin: 10px 20px;
}

.theme-button {
    position: fixed;
    bottom: 60px;
    left: 26px;
}
</style>
