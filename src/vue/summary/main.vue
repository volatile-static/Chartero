<script setup lang="ts">
import {
    ChartBubbleIcon,
    FormatVerticalAlignRightIcon,
    ForkIcon,
    CloudIcon,
    ChartPieIcon,
} from 'tdesign-icons-vue-next';
import Gantt from './components/gantt.vue';
import AuthorBubble from './components/authorBubble.vue';
import WordCloud from './components/wordCloud.vue';
import TagsPie from './components/tagsPie.vue';
</script>
<script lang="ts">
import { GridLightTheme, DarkUnicaTheme } from '@/themes';
import type { AttachmentHistory } from '$/history/history';
export default {
    data() {
        return {
            locale: addon.locale.summary,
            isDark: false,
            messageContent: '',
            itemHistory: new Array<AttachmentHistory>(),
            items: new Array<Zotero.Item>(),
            panelStyle: {
                height: window.innerHeight - 70 + 'px',
                overflow: 'scroll',
            } as CSSStyleDeclaration,
        };
    },
    computed: {
        themeIcon() {
            return this.isDark ? '☀️' : '🌙';
        },
        chartTheme(): object {
            return this.isDark ? DarkUnicaTheme : GridLightTheme;
        },
    },
    mounted() {
        window.addEventListener('message', async e => {
            if (addon.getPref('useDarkTheme') != this.isDark)
                this.switchTheme();
            if (e.data.length < 1) return; // TODO: show message

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
        });
        window.addEventListener('resize', () => {
            this.panelStyle.height = window.innerHeight - 70 + 'px';
        });
    },
    methods: {
        switchTheme() {
            this.isDark = !this.isDark;
            if (this.isDark)
                document.documentElement.setAttribute('theme-mode', 'dark');
            else
                document.documentElement.removeAttribute('theme-mode');
            document
                .querySelectorAll('div.highcharts-data-table')
                .forEach(el => el.remove());
        },
    },
};
</script>

<template>
    <t-layout>
        <t-header class="layout-header" height="22px">
            <span>{{ messageContent }}</span>
            <t-button @click="switchTheme" size="small" variant="text" shape="circle">{{ themeIcon }}</t-button>
        </t-header>
        <t-content>
            <t-tabs placement="bottom" default-value="gantt">
                <t-tab-panel value="bubble" :style="panelStyle">
                    <template #label>
                        <ChartBubbleIcon /> {{ locale.authorBubble }}
                    </template>
                    <AuthorBubble :history="itemHistory" :theme="chartTheme" />
                </t-tab-panel>
                <t-tab-panel value="gantt" :style="panelStyle">
                    <template #label>
                        <FormatVerticalAlignRightIcon /> {{ locale.gantt }}
                    </template>
                    <Gantt :history="itemHistory" :theme="chartTheme" />
                </t-tab-panel>
                <!-- <t-tab-panel value="network" :style="panelStyle">
                    <template #label>
                        <ForkIcon /> {{ locale.network }}
                    </template>
                </t-tab-panel> -->
                <t-tab-panel value="wordCloud" :style="panelStyle">
                    <template #label>
                        <CloudIcon /> {{ locale.wordCloud }}
                    </template>
                    <WordCloud :items="items" :theme="chartTheme" />
                </t-tab-panel>
                <t-tab-panel value="tagsPie" :style="panelStyle">
                    <template #label>
                        <ChartPieIcon /> {{ locale.tagsPie }}
                    </template>
                    <TagsPie :history="itemHistory" :theme="chartTheme" />
                </t-tab-panel>
            </t-tabs>
        </t-content>
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
