<template>
  <div>
    <ComponentToTest :history="history" :theme="theme" />
  </div>
</template>

<script lang="ts">
import ComponentToTest from '../summary/components/reference.vue';
import { DarkUnicaTheme } from '../utility/themes';
import fetchSync from './dummy/fetch';

export default {
    components: { ComponentToTest },
    data() {
        return {
            theme: DarkUnicaTheme,
            selectedItems: fetchSync('ZoteroPane.getCollectionTreeRow().ref.getChildItems(true)') as number[],
        };
    },
    computed: {
        history() {
            return this.selectedItems.map((id: number) => Zotero.Items.get(id));
        },
    },
    async mounted() {
        await this.$nextTick();
        postMessage([...this.selectedItems]);
    },
};
</script>
