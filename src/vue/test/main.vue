<template>
    <div>
        <Component :history="history" :theme="theme"></Component>
    </div>
</template>

<script lang="ts">
import Component from '../summary/components/connectedPapers.vue';
import { DarkUnicaTheme } from '../utility/themes';
import fetchSync from './dummy/fetch';
// import Highcharts from 'highcharts';
import { Chart } from 'highcharts-vue';

export default {
    components: { Component, Chart },
    data() {
        return {
            theme: DarkUnicaTheme,
        };
    },
    computed: {
        history() {
            return fetchSync('ZoteroPane.getCollectionTreeRow().ref.getChildItems(true)').map((id: number) =>
                Zotero.Items.get(id),
            );
        },
    },
};
</script>
