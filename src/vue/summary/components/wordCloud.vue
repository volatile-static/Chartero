<script lang="ts">
import type { Options, SeriesWordcloudOptions } from 'highcharts';
import type { DataOption } from 'tdesign-vue-next/es/transfer/type';
import { Chart } from 'highcharts-vue';
import Highcharts from '@/highcharts';
import StopWords from 'stopwords-iso';
import HistoryAnalyzer from '$/history/analyzer';
import { helpMessageOption, buttons } from '@/utils';
import { toTimeString } from '$/utils';

const Zotero = addon.getGlobal('Zotero');
const segmenter = new Intl.Segmenter(undefined, { granularity: 'word' });
const stopWordSet = new Set(Object.values(StopWords).flat());

export default {
    components: { Chart },
    props: {
        items: { type: Array<Zotero.Item>, required: true },
        theme: Object,
    },
    data() {
        return {
            locale: addon.locale,
            dataOption: 'tag',
            dialogVisible: false,
            filteredTags: addon.getPref('excludedTags'),
            allTags: [] as DataOption[],
        };
    },
    computed: {
        seriesData(): Array<[word: string, weight: number]> {
            const data = new Map<string, number>();

            function setWord(word: string) {
                data.set(word, (data.get(word) ?? 0) + 1);
            }

            function setData(text: string[]) {
                for (const str of text)
                    for (const { segment, isWordLike } of Array.from(segmenter.segment(str))) {
                        const word = segment.toLocaleLowerCase();
                        if (isWordLike && !stopWordSet.has(word))
                            setWord(word);
                    }
            }

            switch (this.dataOption) {
                case 'tag':
                    for (const item of this.items) {
                        const his = addon.history.getInTopLevelSync(item),
                            analyzer = new HistoryAnalyzer(his);
                        item.getTags().forEach(tag => {
                            const tagName = tag.tag,
                                id = Zotero.Tags.getID(tagName);
                            if (tag.type && id && !this.filteredTags.includes(id))
                                data.set(tagName, (data.get(tagName) ?? 0) + analyzer.totalS);
                        });
                    }
                    break;

                case 'author':
                    for (const item of this.items)
                        for (const c of item.getCreators()) 
                            setWord(c.firstName + ' ' + c.lastName);
                    break;

                case 'title':
                    setData(this.items.map(item => item.getField('title') as string));
                    break;

                case 'annotation':
                    setData(
                        this.items
                            .map(item => item.getAttachments())
                            .flat()
                            .map(id => Zotero.Items.get(id))
                            .filter(att => att.isPDFAttachment())
                            .map(att => att.getAnnotations())
                            .flat()
                            .map(anno => anno.annotationText)
                            .filter(text => text),
                    );
                    break;

                default:
                    break;
            }
            return Array.from(data.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, 60);
        },
        chartOpts() {
            const isTag = this.dataOption === 'tag';
            return {
                exporting: {
                    buttons,
                    menuItemDefinitions: helpMessageOption(addon.locale.doc.wordCloud),
                },
                tooltip: {
                    formatter() {
                        const weight = this.options.weight!,
                            context = isTag ? toTimeString(weight) : weight + addon.locale.occurrences;
                        return `
                            <span style="color: ${this.color}">\u25CF</span>
                            <b>${this.key}</b><br/>
                            <span>${context}</span>
                        `;
                    },
                },
                series: [
                    {
                        name: isTag ? addon.locale.time : addon.locale.times,
                        type: 'wordcloud',
                        maxFontSize: 26,
                        minFontSize: 8,
                        data: this.seriesData,
                    } as SeriesWordcloudOptions,
                ],
            } as Options;
        },
        options() {
            return Highcharts.merge(this.chartOpts, this.theme);
        },
    },
    mounted() {
        addEventListener('message', e => {
            if (e.data != 'updateExcludedTags') return;
            this.filteredTags = addon.getPref('excludedTags');
        });
    },
    methods: {
        saveTagFilter() {
            this.dialogVisible = false;
            addon.setPref('excludedTags', this.filteredTags);
        },
        async openDialog() {
            this.dialogVisible = true;
            if (this.items.length < 1) return;
            const ids = await Zotero.Tags.getAutomaticInLibrary(this.items[0].libraryID);
            this.allTags = ids.map(
                id =>
                    ({
                        label: Zotero.Tags.getName(id),
                        value: id,
                    }) as DataOption,
            );
        },
    },
};
</script>

<template>
    <t-space direction="vertical" style="width: 100%">
        <t-space style="padding: 8px" break-line>
            <b>{{ locale.selectDataSource }}</b>
            <t-select v-model="dataOption" :placeholder="locale.sort" size="small" auto-width>
                <t-option value="tag" :label="locale.tags" />
                <t-option value="author" :label="locale.author" />
                <t-option value="title" :label="locale.itemTitle" />
                <t-option value="annotation" :label="locale.pdfAnnotation" />
            </t-select>
            <t-button v-show="dataOption === 'tag'" size="small" @click="openDialog">
                {{ locale.filterTags }}
            </t-button>
        </t-space>
        <Chart :key="JSON.stringify(theme)" :options="options" />
    </t-space>
    <t-dialog v-model:visible="dialogVisible" :on-confirm="saveTagFilter" :header="locale.filterTags"
        :confirm-btn="locale.save" mode="modeless" width="96%" confirm-on-enter draggable>
        <div style="display: block; width: 500px">
            <t-transfer v-model="filteredTags" :title="[locale.allTags, locale.excludedTags]" :data="allTags"
                theme="primary" search />
        </div>
    </t-dialog>
</template>

<style scoped></style>
