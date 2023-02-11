<script lang="ts">
import { GridLightTheme, DarkUnicaTheme } from '../utility/themes';
import type { AttachmentHistory } from 'zotero-reading-history';
import Gantt from './components/gantt.vue';
export default {
    mounted() {
        window.addEventListener('message', async e => {
            if (e.data.length < 1) return;
            this.messageContent =
                parent.document.querySelector(
                    '#zotero-item-pane-message-box description'
                )?.innerHTML ?? '';

            const Items = toolkit.getGlobal('Zotero').Items,
                items: Zotero.Item[] = e.data.map((id: number) =>
                    Items.get(id)
                ),
                topLevels = Items.getTopLevel(items);
            toolkit.log(items, topLevels);
        });
    },
    data() {
        return {
            isDark: false,
            themeIcon: this.isDark ? '☀️' : '🌙',
            messageContent: '',
            itemHistory: new Array<AttachmentHistory>(),
        };
    },
    computed:{
        chartTheme(): object {
            return this.isDark ? DarkUnicaTheme : GridLightTheme;
        },},
    methods: {
        switchTheme() {
            this.isDark = !this.isDark;
            if (this.isDark)
                document.documentElement.setAttribute('theme-mode', 'dark');
            else document.documentElement.removeAttribute('theme-mode');
        },
    },
    components: {Gantt},
};
</script>

<template>
    <t-layout>
        <t-header class="layout-header" height="22px">{{
            messageContent
        }}</t-header>
        <t-content>
            <Gantt :history="itemHistory" :theme="chartTheme"></Gantt>
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
