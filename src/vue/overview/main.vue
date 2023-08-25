<template>
    <Skyline v-if="!loading"></Skyline>
    <ScheduleChart :theme="chartTheme"></ScheduleChart>
    <CollectionPie :theme="chartTheme"></CollectionPie>
    <t-affix :offset-top="160" :offset-bottom="60" style="margin: 16px">
        <t-button @click="onClk" size="large" shape="circle">{{
            themeBtn
        }}</t-button>
    </t-affix>
</template>
<script setup lang="ts">
import Skyline from './components/skyline.vue';
import ScheduleChart from './components/scheduleChart.vue';
import CollectionPie from './components/collectionPie.vue';
</script>

<script lang="ts">
import type { AttachmentHistory } from '$/history/history';
import { GridLightTheme, DarkUnicaTheme } from '@/themes';
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
    },
    mounted() {
        toolkit.getGlobal('Zotero').hideZoteroPaneOverlays();
        nextTick(() => (this.loading = false));
    },
    computed: {
        chartTheme(): object {
            return this.dark ? DarkUnicaTheme : GridLightTheme;
        },
        themeBtn(): string {
            return this.dark ? '☀️' : '🌙';
        },
    },
    data() {
        return {
            loading: true,
            dark: false,
            itemHistory: new Array<AttachmentHistory>(),
            locale: toolkit.locale,
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
