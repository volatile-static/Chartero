<script setup lang="ts">
import {
    ChartBubbleIcon,
    FormatVerticalAlignRightIcon,
    ForkIcon,
    CloudIcon,
} from 'tdesign-icons-vue-next';
import Gantt from './components/gantt.vue';
import AuthorBubble from './components/authorBubble.vue';
import WordCloud from './components/wordCloud.vue';
</script>
<script lang="ts">
import { GridLightTheme, DarkUnicaTheme } from '../utility/themes';
import type { AttachmentHistory } from 'zotero-reading-history';
export default {
    data() {
        return {
            locale: toolkit.locale.summary,
            isDark: false,
            themeIcon: this.isDark ? '☀️' : '🌙',
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
        chartTheme(): object {
            return this.isDark ? DarkUnicaTheme : GridLightTheme;
        },
    },
    mounted() {
        window.addEventListener('message', async e => {
            if (toolkit.getPref('useDarkTheme') != this.isDark)
                this.switchTheme();
            if (e.data.length < 1) return; // TODO: show message

            this.messageContent =
                parent.document.querySelector(
                    '#zotero-item-pane-message-box description'
                )?.innerHTML ?? '';

            const Items = toolkit.getGlobal('Zotero').Items,
                items: Zotero.Item[] = e.data.map((id: number) =>
                    Items.get(id)
                ),
                topLevels = Items.getTopLevel(items).filter(it =>
                    it.isRegularItem()
                ),
                attHisPro = topLevels.map(top =>
                    toolkit.history.getInTopLevel(top)
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
            else document.documentElement.removeAttribute('theme-mode');
        },
    },
};
</script>

<template>
    <t-layout>
        <t-header class="layout-header" height="22px">{{
            messageContent
        }}</t-header>
        <t-content>
            <t-tabs placement="bottom" default-value="gantt">
                <t-tab-panel value="bubble" :style="panelStyle">
                    <template #label>
                        <ChartBubbleIcon /> {{ locale.authorBubble }}
                    </template>
                    <AuthorBubble
                        :history="itemHistory"
                        :theme="chartTheme"
                    ></AuthorBubble>
                </t-tab-panel>
                <t-tab-panel value="gantt" :style="panelStyle">
                    <template #label>
                        <FormatVerticalAlignRightIcon /> {{ locale.gantt }}
                    </template>
                    <Gantt :history="itemHistory" :theme="chartTheme"></Gantt>
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
                    <WordCloud :items="items" :theme="chartTheme"></WordCloud>
                </t-tab-panel>
            </t-tabs>
        </t-content>
    </t-layout>
    <div class="theme-button">
        <t-button @click="switchTheme" size="large" shape="circle">{{
            themeIcon
        }}</t-button>
    </div>
</template>

<style scoped>
.theme-button {
    position: fixed;
    bottom: 60px;
    left: 26px;
}

.layout-header {
    background-color: var(--td-bg-color-secondarycontainer);
}
</style>
