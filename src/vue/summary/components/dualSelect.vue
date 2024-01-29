<template>
    <t-space style="margin: 8px" size="small" break-line>
        {{ locale.selectCorrespondingAuthor }}
        <t-select
            v-model="selectedItem"
            :options="itemOptions"
            size="small"
            :placeholder="locale.itemTitle"
            clearable
        />
        <t-select
            v-model="selectedAuthor"
            :options="authorOptions"
            size="small"
            :placeholder="locale.author"
            :disabled="selectedItem == undefined"
            @change="onChange"
        />
    </t-space>
</template>

<script lang="ts">
import { creator2str } from '@/utils';
import type { SelectValue } from 'tdesign-vue-next';
export default {
    data() {
        return {
            locale: addon.locale,
            selectedItem: undefined as number | undefined,
            selectedAuthor: undefined as number | undefined,
        };
    },
    computed: {
        itemOptions() {
            return this.items.map(it => ({ value: it.id, label: it.getField('title') }));
        },
        authorOptions() {
            const item = this.items.find(it => it.id === this.selectedItem),
                authors = item?.getCreatorsJSON()?.map(creator2str).filter(Boolean),
                index = item && addon.extraField.getExtraField(item, 'CorrespondingAuthorIndex');
            if (!authors) return [];

            this.selectedAuthor = index ? parseInt(index) : authors.length - 1;
            return authors.map((name, idx) => ({ value: idx, label: `${idx + 1}. ${name}` }));
        },
    },
    methods: {
        onChange(value: SelectValue) {
            const item = this.items.find(it => it.id === this.selectedItem)!;
            addon.extraField.setExtraField(item, 'CorrespondingAuthorIndex', value as string);
            this.$emit('change');
        },
    },
    props: {
        items: { type: Array<Zotero.Item>, required: true },
    },
};
</script>
