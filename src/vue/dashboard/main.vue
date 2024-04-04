<template>
  <div v-show="activeTab == SectionTab.Progress">
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
  </div>

  <PageTime v-show="activeTab == SectionTab.Page" :history="itemHistory" :theme="chartTheme" />

  <DateTime v-show="activeTab == SectionTab.Date" :history="itemHistory" :theme="chartTheme" />

  <UserPie v-show="activeTab == SectionTab.Group" :history="itemHistory" :theme="chartTheme" />

  <Network
    v-show="activeTab == SectionTab.Relation" :top-level="topLevel" :theme="chartTheme"
    :item-i-d="topLevel?.id"
  />

  <TimeLine v-show="activeTab == SectionTab.Timeline" :history="itemHistory" />
</template>

<script lang="ts">
import { nextTick } from 'vue';
import { GridLightTheme, DarkUnicaTheme } from '@/themes';
import PageTime from './components/pageTime.vue';
import DateTime from './components/dateTime.vue';
import TimeLine from './components/timeline.vue';
import Network from './components/network.vue';
import UserPie from './components/userPie.vue';
import anime from 'animejs';
import HistoryAnalyzer from '$/history/analyzer';
import type { AttachmentHistory } from '$/history/history';

enum SectionTab {
    Progress = 'progress',
    Bubble = 'bubble',
    Page = 'page',
    Date = 'date',
    Group = 'group',
    Relation = 'relation',
    Timeline = 'timeline',
}

export default {
    components: { PageTime, DateTime, TimeLine, Network, UserPie },
    data() {
        return {
            dark: false,
            locale: addon.locale,
            SectionTab,
            activeTab: SectionTab.Progress,
            noteNum: 0,
            noteWords: 0,
            readPages: 0,
            numPages: 0,
            numAttachment: 0,
            attachmentSize: '',
            item: null as null | Zotero.Item,
            animateInt: {
                round: 1,
                duration: 260,
                targets: this,
            } as anime.AnimeParams,
            realtimeUpdating: false,
        };
    },
    computed: {
        isUserLib(): boolean {
            return this.item?.libraryID == Zotero.Libraries.userLibraryID;
        },
        readingProgress(): number {
            if (this.itemHistory.length < 1) return 0;
            const ha = new HistoryAnalyzer(this.itemHistory);
            return ha.progress;
        },
        chartTheme(): object {
            return this.dark ? DarkUnicaTheme : GridLightTheme;
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
            
                const his =
                    this.item && addon.history.getByAttachment(this.item);
                // addon.log('itemHistory: ', his);
                return his ? [his] : [];
        },
    },
    mounted() {
        const darkMedia = matchMedia('(prefers-color-scheme: dark)');
        darkMedia.addEventListener('change', e => this.switchTheme(e.matches));
        this.switchTheme(darkMedia.matches);

        addEventListener('message', e => {
            if (typeof e.data.tab == 'string') {
                this.activeTab = e.data.tab;
                return;
            }

            // 判断消息是否包含ID
            if (typeof e.data.id != 'number')
                return;

            this.item = Zotero.Items.get(e.data.id); // 获取传入的条目
            if (addon.getPref('enableRealTimeDashboard'))  // 强制刷新
                this.realtimeUpdating = !this.realtimeUpdating;
            nextTick(() => {
                try {
                    this.updateNotes();
                    this.updateProgress();
                    this.updateSize();
                } catch (error) {
                    addon.log(error);
                }
            });
        });
    },
    methods: {
        switchTheme(dark: boolean) {
            this.dark = dark;
            if (dark)
                document.documentElement.setAttribute('theme-mode', 'dark');
            else
                document.documentElement.removeAttribute('theme-mode');
            document
                .querySelectorAll('div.highcharts-data-table')
                .forEach(el => el.remove());
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
