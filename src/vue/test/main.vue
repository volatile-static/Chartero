<template>
  <div>
    <ComponentToTest :items="his" :history="his" :theme="theme" />
  </div>
</template>

<script lang="ts">
// import ComponentToTest from '../dashboard/main.vue';
// import ComponentToTest from '../summary/components/dualSelect.vue';
// import ComponentToTest from '../overview/main.vue';
import ComponentToTest from '../summary/components/gantt.vue';
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
        its() {
            return this.selectedItems.map((id: number) => Zotero.Items.get(id));
        },
        his() {
            return this.its
                .filter(it => it.isRegularItem())
                .map(it => addon.history.getInTopLevelSync(it))
                .flat();
        },
    },
    async mounted() {
        await this.$nextTick();
        // postMessage([...this.selectedItems]);
        // postMessage({ id: fetchSync('ZoteroPane.getSelectedItems(true)[0]') });
    },
};
</script>
