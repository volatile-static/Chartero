<template>
    <div>
        <Component :history="history" :theme="theme"></Component>
    </div>
</template>

<script lang="ts">
import Component from '../summary/main.vue';
import { DarkUnicaTheme } from '../utility/themes';
import fetchSync from './dummy/fetch';
import { Chart } from 'highcharts-vue';

export default {
    components: { Component, Chart },
    data() {
        return {
            theme: DarkUnicaTheme,
            selectedItems: fetchSync('ZoteroPane.getCollectionTreeRow().ref.getChildItems(true)') as number[],
        };
    },
    async mounted() {
        await this.$nextTick();
        postMessage(this.selectedItems);
    },
    computed: {
        history() {
            return this.selectedItems.map((id: number) => Zotero.Items.get(id));
        },
    },
};
</script>
