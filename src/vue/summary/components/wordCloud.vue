<script lang="ts">
import type { Options, SeriesWordcloudOptions } from 'highcharts';
import type { DataOption } from 'tdesign-vue-next/es/transfer/type';
import Highcharts from '@/utility/highcharts';
import HistoryAnalyzer from '@/utility/history';
import { toTimeString } from '@/utility/utils';

const Zotero = toolkit.getGlobal('Zotero');

export default {
    data() {
        return {
            locale: toolkit.locale,
            dataOption: 'tag',
            dialogVisible: false,
            filteredTags: [] as number[],
            allTags: [] as DataOption[],
        };
    },
    computed: {
        seriesData(): Array<[word: string, weight: number]> {
            const data = new Map<string, number>();

            function setData(text: string[]) {
                text.forEach(str => {
                    const words = str.split(/\W/g).filter(w => w.length > 3);
                    words.forEach(word => {
                        data.set(word, (data.get(word) ?? 0) + 1);
                    });
                });
            }

            switch (this.dataOption) {
                case 'tag':
                    for (const item of this.items) {
                        const his = toolkit.history.getInTopLevelSync(item),
                            analyzer = new HistoryAnalyzer(his);
                        item.getTags().forEach(tag => {
                            const tagName = tag.tag,
                                id = Zotero.Tags.getID(tagName);
                            if (id && !this.filteredTags.includes(id))
                                data.set(
                                    tagName,
                                    (data.get(tagName) ?? 0) + analyzer.totalS
                                );
                        });
                    }
                    break;

                case 'author':
                    setData(this.items.map(item => item.firstCreator));
                    break;

                case 'title':
                    setData(
                        this.items.map(item => item.getField('title') as string)
                    );
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
                            .filter(text => text)
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
                tooltip: {
                    formatter: function () {
                        const weight = this.point.options.weight!,
                            context = isTag
                                ? toTimeString(weight)
                                : weight + toolkit.locale.occurrences;
                        return `
                            <span style="color: ${this.color}">\u25CF</span>
                            <b>${this.key}</b><br/>
                            <span>${context}</span>
                        `;
                    },
                },
                series: [
                    {
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
    methods: {
        saveTagFilter() {
            this.dialogVisible = false;
            toolkit.log(this.filteredTags);
        },
        async openDialog() {
            this.dialogVisible = true;
            if (this.items.length < 1) return;
            const ids = await Zotero.Tags.getAutomaticInLibrary(
                this.items[0].libraryID
            );
            //@ts-expect-error
            this.allTags = ids.map(id => ({
                label: Zotero.Tags.getName(id),
                value: id,
            }));
        },
    },
    props: {
        items: { type: Array<Zotero.Item>, required: true },
        theme: Object,
    },
};
</script>
<script lang="ts" setup>
import { Chart } from 'highcharts-vue';
</script>

<template>
    <t-space direction="vertical" style="width: 100%">
        <t-space style="padding: 8px" break-line>
            <b>{{ locale.selectDataSource }}</b>
            <t-select
                v-model="dataOption"
                :placeholder="locale.sort"
                size="small"
                auto-width
            >
                <t-option value="tag" :label="locale.tags"></t-option>
                <t-option value="author" :label="locale.author"></t-option>
                <t-option value="title" :label="locale.itemTitle"></t-option>
                <t-option
                    value="annotation"
                    :label="locale.pdfAnnotation"
                ></t-option>
            </t-select>
            <t-button
                v-show="dataOption === 'tag'"
                size="small"
                @click="openDialog"
            >
                {{ locale.filterTags }}
            </t-button>
        </t-space>
        <Chart :options="options" :key="theme"></Chart>
    </t-space>
    <t-dialog
        v-model:visible="dialogVisible"
        :on-confirm="saveTagFilter"
        :header="locale.filterTags"
        :confirmBtn="locale.save"
        mode="modeless"
        width="96%"
        confirm-on-enter
        draggable
    >
        <div style="display: block; width: 500px">
            <t-transfer
                :title="[locale.allTags, locale.excludedTags]"
                :data="allTags"
                v-model="filteredTags"
                theme="primary"
                search
            />
        </div>
    </t-dialog>
</template>

<style scoped></style>
