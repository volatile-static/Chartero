<template>
    <t-collapse
        :default-value="['progress', 'date']"
        :value="collapseValue"
        @change="onCollapseChange"
        expand-icon-placement="right"
    >
        <t-collapse-panel value="progress" :header="locale.readingProgress">
            <t-space align="center" size="small" class="progress-space">
                <t-progress
                    theme="circle"
                    size="small"
                    :percentage="readingProgress"
                />
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
    </t-collapse>
    <t-affix :offset-top="160" :offset-bottom="20" style="margin: 16px">
        <t-button @click="onClk" size="large" shape="circle">{{
            themeBtn
        }}</t-button>
    </t-affix>
</template>

<script lang="ts">
import type { AttachmentHistory } from 'zotero-reading-history';
import { GridLightTheme, DarkUnicaTheme } from '../components/themes';
import PageTime from '../components/pageTime.vue';
import DateTime from '../components/dateTime.vue';
import type { CollapseValue } from 'tdesign-vue-next';

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
            const Items = toolkit.getGlobal('Zotero').Items,
                item = Items.get(e.data.id); // 获取传入的条目
            let topLevel = item;

            // 传入附件的条件：阅读器
            if (!item.isRegularItem()) {
                if (item.parentItem) topLevel = item.parentItem;
                else {
                    // 独立PDF的情况
                    const his = toolkit.history.getByAttachment(item);
                    if (his) {
                        this.itemHistory = [his];
                        return;
                    } else {
                        // 没有记录
                    }
                }
            }

            // 统计笔记信息
            const noteIDs = topLevel.getNotes(),
                notes = noteIDs.map(id => Items.get(id).getNote()),
                text = notes.map(str => str.replace(/<[^<>]+>/g, '')).join('');
            this.noteNum = noteIDs.length;
            this.noteWords = text.replace(/\s/g, '').length;

            // 更新阅读进度
            const best = await topLevel.getBestAttachment(),
                bestHis = best && toolkit.history.getByAttachment(best);
            if (bestHis) {
                this.readPages = bestHis.record.readPages;
                this.numPages = bestHis.record.numPages ?? 0;
            }

            // 统计附件大小
            const File = toolkit.getGlobal('Zotero').File,
                files = topLevel
                    .getAttachments()
                    .map(id => Items.get(id))
                    .filter(it => it.isPDFAttachment())
                    .map(it => it.getFilePath()),
                totalSize = files.reduce(
                    (size, file) =>
                        file ? File.pathToFile(file).fileSize + size : size,
                    0
                );
            this.attachmentSize = (totalSize / 1024 / 1024).toFixed(2);
            this.numAttachment = topLevel.numPDFAttachments();

            this.itemHistory = await toolkit.history.getInTopLevel(topLevel);
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
        };
    },
    components: { PageTime, DateTime },
};
</script>

<style scoped>
.progress-info {
    justify-content: center;
    align-content: center;
    display: flex;
    flex-direction: column;
}

.progress-space {
    margin: 10px 20px;
}
</style>
