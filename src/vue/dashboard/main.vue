<template>
    <t-collapse
        :default-value="['progress', 'date']"
        :value="collapseValue"
        @change="onCollapseChange"
        expand-icon-placement="right"
    >
        <t-collapse-panel value="progress" :header="locale.readingProgress">
            <t-space align="center" size="small" class="progress-space">
                <t-tooltip
                    :content="locale.readingProgressTip"
                    :show-arrow="false"
                >
                    <t-progress
                        theme="circle"
                        size="small"
                        :percentage="readingProgress"
                    />
                </t-tooltip>
                <div class="progress-info">
                    <span>{{
                        `🔖 ${locale.progressLabel.read} ${readPages} ${locale.pages} / ${locale.progressLabel.total} ${numPages} ${locale.pages}`
                    }}</span>
                    <span>{{
                        `📚 ${numAttachment} ${locale.progressLabel.PDFs} / ${locale.progressLabel.total} ${attachmentSize} MB`
                    }}</span>
                    <span
                        >📝 {{ noteNum }} {{ locale.progressLabel.notes }} /
                        {{ locale.progressLabel.total }} {{ noteWords }}
                        {{ locale.progressLabel.words }}</span
                    >
                </div>
                <template #separator>
                    <t-divider layout="vertical" />
                </template>
            </t-space>
        </t-collapse-panel>

        <t-collapse-panel
            value="page"
            :header="locale.chartTitle.pageTime"
            :disabled="collapseDisabled"
        >
            <PageTime :history="itemHistory" :theme="chartTheme"></PageTime>
        </t-collapse-panel>

        <t-collapse-panel
            value="date"
            :header="locale.chartTitle.dateTime"
            :disabled="collapseDisabled"
        >
            <DateTime :history="itemHistory" :theme="chartTheme"></DateTime>
        </t-collapse-panel>

        <t-collapse-panel
            value="network"
            :header="locale.chartTitle.network"
            :disabled="collapseDisabled"
        >
            <Network :item="topLevel" :theme="chartTheme"></Network>
        </t-collapse-panel>

        <t-collapse-panel
            value="timeline"
            :header="locale.timeline"
            :disabled="collapseDisabled"
        >
            <TimeLine :history="itemHistory"></TimeLine>
        </t-collapse-panel>
    </t-collapse>

    <t-affix :offset-top="160" :offset-bottom="60" style="margin: 16px">
        <t-button @click="onClk" size="large" shape="circle">{{
            themeBtn
        }}</t-button>
    </t-affix>
</template>

<script lang="ts">
import type { AttachmentHistory } from 'zotero-reading-history';
import type { CollapseValue } from 'tdesign-vue-next';
import { GridLightTheme, DarkUnicaTheme } from '../utility/themes';
import PageTime from './components/pageTime.vue';
import DateTime from './components/dateTime.vue';
import TimeLine from './components/timeline.vue';
import Network from './components/network.vue';
import anime from 'animejs';

export default {
    methods: {
        onClk() {
            this.dark = !this.dark;
            if (this.dark)
                document.documentElement.setAttribute('theme-mode', 'dark');
            else document.documentElement.removeAttribute('theme-mode');
        },
        onCollapseChange(val: CollapseValue) {
            this.collapseValue =
                this.itemHistory.length < 1 ? ['progress'] : val;
        },
    },
    mounted() {
        window.addEventListener('message', async e => {
            if (typeof e.data.id != 'number') return; // 判断消息是否包含ID
            const animateInt = {
                    round: 1,
                    duration: 260,
                    targets: this,
                } as anime.AnimeParams,
                Items = toolkit.getGlobal('Zotero').Items,
                item = Items.get(e.data.id); // 获取传入的条目
            this.topLevel = item;

            // 传入附件的条件：阅读器
            if (!item.isRegularItem()) {
                if (item.parentItem)
                    this.topLevel = item.parentItem; // 常规条目
                else {
                    // 独立PDF的情况
                    const his = toolkit.history.getByAttachment(item);
                    this.itemHistory = his ? [his] : [];
                    return;
                }
            }

            // 统计笔记信息
            const noteIDs = this.topLevel.getNotes(),
                notes = noteIDs.map(id => Items.get(id).getNote()),
                text = notes.map(str => str.replace(/<[^<>]+>/g, '')).join('');
            // this.noteNum = noteIDs.length;
            // this.noteWords = text.replace(/\s/g, '').length;
            anime({ ...animateInt, noteNum: noteIDs.length });
            anime({ ...animateInt, noteWords: text.replace(/\s/g, '').length });

            // 更新阅读进度
            const best = await this.topLevel.getBestAttachment(),
                bestHis = best && toolkit.history.getByAttachment(best);
            if (bestHis) {
                anime({ ...animateInt, readPages: bestHis.record.readPages });
                anime({
                    ...animateInt,
                    numPages: bestHis.record.numPages ?? 0,
                });
                // this.readPages = bestHis.record.readPages;
                // this.numPages = bestHis.record.numPages ?? 0;
            }

            // 统计附件大小
            const File = toolkit.getGlobal('Zotero').File,
                files = this.topLevel
                    .getAttachments()
                    .map(id => Items.get(id))
                    .filter(it => it.isPDFAttachment())
                    .map(it => it.getFilePath()),
                totalSize = files.reduce(
                    (size, file) =>
                        file ? File.pathToFile(file).fileSize + size : size,
                    0
                );
            anime({
                targets: this,
                attachmentSize: (totalSize / 1024 / 1024).toFixed(2),
                round: 100,
                duration: 260,
                easing: 'linear',
            });
            anime({
                ...animateInt,
                numAttachment: this.topLevel.numPDFAttachments(),
            });
            // this.numAttachment = this.topLevel.numPDFAttachments();

            this.itemHistory = await toolkit.history.getInTopLevel(
                this.topLevel
            );
        });
    },
    computed: {
        readingProgress(): number {
            if (this.itemHistory.length < 1) return 0;
            const ha = new toolkit.HistoryAnalyzer(this.itemHistory);
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
    },
    watch: {
        collapseDisabled(val: boolean) {
            if (val) this.collapseValue = ['progress'];
        },
    },
    data() {
        return {
            dark: false,
            itemHistory: new Array<AttachmentHistory>(),
            locale: toolkit.locale,
            noteNum: 0,
            noteWords: 0,
            readPages: 0,
            numPages: 0,
            numAttachment: 0,
            attachmentSize: '',
            collapseValue: ['progress'] as Array<string | number>,
            topLevel: null as null | Zotero.Item,
        };
    },
    components: { PageTime, DateTime, TimeLine, Network },
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
</style>
