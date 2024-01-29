<script lang="ts">
import {
    ChartBubbleIcon,
    FormatVerticalAlignRightIcon,
    ForkIcon,
    CloudIcon,
    ChartPieIcon,
} from 'tdesign-icons-vue-next';
import Gantt from './components/gantt.vue';
import AuthorBubble from './components/authorBubble.vue';
import Sankey from './components/sankey.vue';
import WordCloud from './components/wordCloud.vue';
import TagsPie from './components/tagsPie.vue';
import ConnectedPapers from './components/connectedPapers.vue';
import { GridLightTheme, DarkUnicaTheme } from '@/themes';
import type { AttachmentHistory } from '$/history/history';
export default {
    components: { ConnectedPapers, Sankey, Gantt, AuthorBubble, WordCloud, TagsPie, ChartBubbleIcon, FormatVerticalAlignRightIcon, ForkIcon, CloudIcon, ChartPieIcon },
    data() {
        return {
            locale: addon.locale.summary,
            isDark: matchMedia('(prefers-color-scheme: dark)').matches,
            messageContent: '',
            itemHistory: new Array<AttachmentHistory>(),
            items: new Array<Zotero.Item>(),
            panelStyle: {
                height: window.innerHeight - 71 + 'px',
                overflow: 'scroll',
            } as CSSStyleDeclaration,
        };
    },
    computed: {
        chartTheme(): object {
            return this.isDark ? DarkUnicaTheme : GridLightTheme;
        },
    },
    methods: {
        switchTheme(dark: boolean) {
            this.isDark = dark;
            if (dark)
                document.documentElement.setAttribute('theme-mode', 'dark');
            else
                document.documentElement.removeAttribute('theme-mode');
        }
    },
    mounted() {
        const colorScheme = matchMedia('(prefers-color-scheme: dark)');
        colorScheme.addEventListener('change', (e) => this.switchTheme(e.matches));

        window.addEventListener('message', async e => {
            if (!Array.isArray(e.data) || e.data.length < 1)
                return; // TODO: show message

            this.messageContent =
                parent.document.querySelector(
                    '#zotero-item-pane-message-box description'
                )?.innerHTML ?? '';

            const Items = addon.getGlobal('Zotero').Items,
                items: Zotero.Item[] = e.data.map((id: number) =>
                    Items.get(id)
                ),
                topLevels = Items.getTopLevel(items).filter(it =>
                    it.isRegularItem()
                ),
                attHisPro = topLevels.map(top =>
                    addon.history.getInTopLevel(top)
                ),
                his = await Promise.all(attHisPro);
            this.items = topLevels;
            this.itemHistory = his.flat();
            // addon.log(`Summary items: ${this.items.length}, history: ${this.itemHistory.length}`)
        });
        window.addEventListener('resize', () => {
            this.panelStyle.height = window.innerHeight - 71 + 'px';
        });
        this.switchTheme(this.isDark);
    }
};
</script>

<template>
    <t-layout>
        <t-content>
            <t-tabs default-value="gantt">
                <t-tab-panel value="sankey" :style="panelStyle">
                    <template #label>
                        <ChartBubbleIcon /> {{ locale.sankey }}
                    </template>
                    <Sankey :history="items" :theme="chartTheme" />
                </t-tab-panel>
                <t-tab-panel value="gantt" :style="panelStyle">
                    <template #label>
                        <FormatVerticalAlignRightIcon /> {{ locale.gantt }}
                    </template>
                    <Gantt :history="itemHistory" :theme="chartTheme" />
                </t-tab-panel>
                <t-tab-panel value="network" :style="panelStyle">
                    <template #label>
                        <ForkIcon /> network
                    </template>
                    <ConnectedPapers :history="items" :theme="chartTheme" />
                </t-tab-panel>
                <t-tab-panel value="wordCloud" :style="panelStyle">
                    <template #label>
                        <CloudIcon /> {{ locale.wordCloud }}
                    </template>
                    <WordCloud :items="items" :theme="chartTheme" />
                </t-tab-panel>
                <!-- <t-tab-panel value="tagsPie" :style="panelStyle">
                    <template #label>
                        <ChartPieIcon /> {{ locale.tagsPie }}
                    </template>
                    <TagsPie :history="itemHistory" :theme="chartTheme" />
                </t-tab-panel> -->
            </t-tabs>
        </t-content>
        <t-header class="layout-header" height="22px">
            <span>{{ messageContent }}</span>
        </t-header>
    </t-layout>
</template>

<style scoped>
.layout-header {
    background-color: var(--td-bg-color-secondarycontainer);
    border-bottom: solid 1px var(--td-border-level-1-color);
    display: inline-flex;
    justify-content: space-between;
    padding: 0 8px;
}
</style>
