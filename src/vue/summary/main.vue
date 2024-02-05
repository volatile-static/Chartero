<script lang="ts">
import {
    TreeRoundDotVerticalIcon,
    ChartRadialIcon,
    ChartColumIcon,
    ChartRingIcon,
    FormatVerticalAlignRightIcon,
    BlockchainIcon,
    CloudIcon,
    ChartPieIcon,
} from 'tdesign-icons-vue-next';
import Gantt from './components/gantt.vue';
import AuthorBubble from './components/authorBubble.vue';
import Sankey from './components/sankey.vue';
import WordCloud from './components/wordCloud.vue';
import TagsPie from './components/tagsPie.vue';
import KpiGauge from './components/kpiGauge.vue';
import JCR from './components/jcr.vue';
import authorIF from './components/authorIF.vue';
import Reference from './components/reference.vue';
import { GridLightTheme, DarkUnicaTheme } from '@/themes';
import type { AttachmentHistory } from '$/history/history';
export default {
    components: {
        Reference,
        Sankey,
        Gantt,
        AuthorBubble,
        WordCloud,
        TagsPie,
        TreeRoundDotVerticalIcon,
        FormatVerticalAlignRightIcon,
        BlockchainIcon,
        CloudIcon,
        ChartPieIcon,
        ChartColumIcon,
        ChartRadialIcon,
        ChartRingIcon,
        KpiGauge,
        JCR,
        authorIF,
    },
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
            greenFrog: 'greenfrog' in Zotero,
        };
    },
    computed: {
        chartTheme(): object {
            return this.isDark ? DarkUnicaTheme : GridLightTheme;
        },
    },
    mounted() {
        const colorScheme = matchMedia('(prefers-color-scheme: dark)');
        colorScheme.addEventListener('change', e => this.switchTheme(e.matches));

        window.addEventListener('message', async e => {
            if (!Array.isArray(e.data) || e.data.length < 1) return; // TODO: show message

            this.messageContent =
                parent.document.querySelector('#zotero-item-pane-message-box description')?.innerHTML ?? '';

            const Items = Zotero.Items,
                items: Zotero.Item[] = e.data.map((id: number) => Items.get(id)),
                topLevels = Items.getTopLevel(items).filter(it => it.isRegularItem()),
                attHisPro = topLevels.map(top => addon.history.getInTopLevel(top)),
                his = await Promise.all(attHisPro);
            this.items = topLevels;
            this.itemHistory = his.flat();
            // addon.log(`Summary items: ${this.items.length}, history: ${this.itemHistory.length}`)
        });
        window.addEventListener('resize', () => {
            this.panelStyle.height = window.innerHeight - 71 + 'px';
        });
        this.switchTheme(this.isDark);
    },
    methods: {
        switchTheme(dark: boolean) {
            this.isDark = dark;
            if (dark) document.documentElement.setAttribute('theme-mode', 'dark');
            else document.documentElement.removeAttribute('theme-mode');
        },
    },
};
</script>

<template>
  <t-layout>
    <t-content>
      <t-tabs default-value="gantt">
        <t-tab-panel value="sankey" :style="panelStyle">
          <template #label>
            <TreeRoundDotVerticalIcon /> {{ locale.sankey }}
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
            <BlockchainIcon />{{ locale.reference }}
          </template>
          <Reference :history="items" :theme="chartTheme" />
        </t-tab-panel>
        <t-tab-panel value="wordCloud" :style="panelStyle">
          <template #label>
            <CloudIcon /> {{ locale.wordCloud }}
          </template>
          <WordCloud :items="items" :theme="chartTheme" />
        </t-tab-panel>
        <t-tab-panel value="kpiGauge" :style="panelStyle">
          <template #label>
            <ChartRadialIcon /> {{ locale.kpiGauge }}
          </template>
          <KpiGauge :history="itemHistory" :theme="chartTheme" :items-count="items.length" />
        </t-tab-panel>
        <t-tab-panel v-if="greenFrog" value="jcr" :style="panelStyle">
          <template #label>
            <ChartRingIcon /> {{ locale.jcrPie }}
          </template>
          <JCR :items="items" :theme="chartTheme" />
        </t-tab-panel>
        <t-tab-panel v-if="greenFrog" value="authorIF" :style="panelStyle">
          <template #label>
            <ChartColumIcon /> {{ locale.authorIF }}
          </template>
          <authorIF :items="items" :theme="chartTheme" />
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
