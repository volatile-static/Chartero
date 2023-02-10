<script lang="ts">
import type { AttachmentHistory } from 'zotero-reading-history';
export default {
    props: {
        history: {
            type: Array<AttachmentHistory>,
            required: true,
        },
    },
};
</script>

<template>
    <t-timeline>
        <t-timeline-item></t-timeline-item>
    </t-timeline>
</template>

<style scoped></style>
