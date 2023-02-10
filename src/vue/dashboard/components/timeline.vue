<script lang="ts">
import type { AttachmentHistory } from 'zotero-reading-history';
import { toTimeString, getTitle } from '../../utility/utils';

export default {
    props: {
        history: {
            type: Array<AttachmentHistory>,
            required: true,
        },
    },
    watch: {
        history(newHis: AttachmentHistory[]) {
            this.items.length = 0;
            const ha = new toolkit.HistoryAnalyzer(newHis),
                firstTime = ha.firstTime,
                lastTime = ha.lastTime;
            if (firstTime && lastTime)
                for (let i = firstTime; i <= lastTime; i += 86400) {
                    const date = new Date(i * 1000),
                        sec = ha.getByDate(date);
                    if (sec > 0)
                        this.items.push({
                            date: date.toLocaleDateString(),
                            time: toTimeString(sec),
                            title: getTitle(newHis[0]), // TODO
                        });
                }
        },
    },
    data() {
        return {
            items: new Array<{ date: string; time: string; title?: string }>(),
        };
    },
};
</script>

<template>
    <div class="timeline">
        <t-timeline style="margin: auto">
            <t-timeline-item
                v-for="item of items"
                :label="item.date"
                dot-color="primary"
            >
                <t-tag theme="success" variant="light" max-width="260px">{{
                    item.title
                }}</t-tag>
                <p>{{ item.time }}</p>
            </t-timeline-item>
        </t-timeline>
    </div>
</template>

<style scoped>
.timeline {
    display: flex;
    align-content: center;
    padding: 10px;
}
</style>
