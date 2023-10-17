<script lang="ts">
import { Chart } from 'highcharts-vue';
import Highcharts from '@/highcharts';
import HistoryAnalyzer from '$/history/analyzer';
import { helpMessageOption } from '@/utils';
import type { AttachmentHistory } from '$/history/history';

export default {
    components: { Chart },
    data() {
        return {
            locale: addon.locale,
            dataOption: 'journal',
        };
    },
    methods: {
        getJournalData(items: Zotero.Item[]) {
            const journalMap: Record<string, number> = {};
            for (const item of items) {
                const name = item.getField('journalAbbreviation')
                    || item.getField('publicationTitle')
                    || item.getField('conferenceName')
                    || item.getField('university');
                if (typeof name == 'string')
                    journalMap[name] = (journalMap[name] ?? 0) + 1;
            }
            addon.log(journalMap);
            return Object.entries(journalMap).map(([name, y]) => ({
                name,
                y,
                z: y,
            }));
        }
    },
    computed: {
        chartOpts(): Highcharts.Options {
            const ha = new HistoryAnalyzer(this.history),
                parents = ha.parents.filter(it => it?.isRegularItem()) as Zotero.Item[];

            return {
                exporting: {
                    menuItemDefinitions: helpMessageOption(
                        addon.locale.doc.pie
                    )
                },
                plotOptions: { variablepie: { allowPointSelect: true } },
                series: [
                    {
                        type: 'variablepie',
                        data: this.getJournalData(parents),
                        innerSize: '20%',
                    } as Highcharts.SeriesVariablepieOptions,
                ],
            };
        },
        options() {
            return Highcharts.merge(this.chartOpts, this.theme);
        },
    },
    props: {
        history: {
            type: Array<AttachmentHistory>,
            required: true,
        },
        theme: Object,
    },
};
</script>

<template>
    <t-space direction="vertical" style="width: 100%">
        <t-space style="padding: 8px" break-line>
            <b>{{ locale.selectDataSource }}</b>
            <t-select v-model="dataOption" :placeholder="locale.sort" size="small" auto-width>
                <t-option value="journal" :label="locale.tags"></t-option>
                <t-option value="firstCreator" :label="locale.author"></t-option>
                <t-option value="lastCreator" :label="locale.author"></t-option>
            </t-select>
        </t-space>
        <Chart :options="options" :key="theme"></Chart>
    </t-space>
</template>

<style scoped></style>
