<template>
    <t-collapse :default-value="['progress', 'date']" expand-icon-placement="right">
        <t-collapse-panel value="progress" :header="locale.readingProgress">
            <t-progress theme="circle" size="small" :percentage="readingProgress"/>
        </t-collapse-panel>
        <t-collapse-panel value="page" :header="locale.chartTitle.pageTime">
            <PageTime :history="itemHistory"></PageTime>
        </t-collapse-panel>
        <t-collapse-panel value="date" :header="locale.chartTitle.dateTime">
            <DateTime :history="itemHistory"></DateTime>
        </t-collapse-panel>
    </t-collapse>
</template>

<script lang="ts">
import type { AttachmentHistory } from 'zotero-reading-history';
import PageTime from '../components/pageTime.vue';
import DateTime from '../components/dateTime.vue';

let his: AttachmentHistory[];

export default {
    mounted() {
        window.addEventListener('message', async e => {
            if (typeof e.data.id != 'number') return;
            const item = toolkit.getGlobal('Zotero').Items.get(e.data.id);
            if (!item.isRegularItem()) return;
            this.his = await toolkit.history.getInTopLevel(item);
        });
    },
    computed: {
        itemHistory(): AttachmentHistory | undefined {
            return this.his?.at(0);
        },
        readingProgress(): number {
            if (!this.his) return 0;
            const ha = new toolkit.HistoryAnalyzer(this.his);
            toolkit.log(ha);
            return ha.progress;
        },
    },
    data() {
        return { his, locale: toolkit.locale };
    },
    components: { PageTime, DateTime },
};
</script>

<style scoped></style>
