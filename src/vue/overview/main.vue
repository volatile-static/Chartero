<template>
        <Skyline v-if="!loading"></Skyline>
    <t-affix :offset-top="160" :offset-bottom="60" style="margin: 16px">
        <t-button @click="onClk" size="large" shape="circle">{{
            themeBtn
        }}</t-button>
    </t-affix>
</template>
<script setup lang="ts">
import Skyline from './components/skyline.vue';
</script>

<script lang="ts">
import type { AttachmentHistory } from 'zotero-reading-history';
import type { CollapseValue } from 'tdesign-vue-next';
import { GridLightTheme, DarkUnicaTheme } from '../utility/themes';
import anime from 'animejs';
import { nextTick } from 'vue';

export default {
    methods: {
        onClk() {
            this.dark = !this.dark;
            if (this.dark)
                document.documentElement.setAttribute('theme-mode', 'dark');
            else document.documentElement.removeAttribute('theme-mode');
            document
                .querySelectorAll('div.highcharts-data-table')
                .forEach(el => el.remove());
        },
        onCollapseChange(val: CollapseValue) {
            this.collapseValue =
                this.itemHistory.length < 1 ? ['progress'] : val;
        },
    },
    mounted() {
        toolkit.getGlobal('Zotero').hideZoteroPaneOverlays();
        this.loading = false;
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
            loading: true,
            dark: false,
            itemHistory: new Array<AttachmentHistory>(),
            locale: toolkit.locale,
            mode: 'lib' as 'lib' | 'reader',
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
