<template>
    <div id="skyline-layout">
        <div id="week-layout">
            <p class="skyline-label">Mon</p>
            <p class="skyline-label">Wed</p>
            <p class="skyline-label" data-flow="top">Fri</p>
        </div>
        <div id="month-layout">
            <p
                v-for="month in 13"
                class="skyline-label"
                :id="'month-label-' + month"
            >
                {{ monthStrings[(now.getMonth() + month) % 12] }}
            </p>
        </div>
        <div id="block-container">
            <TTooltip
                v-for="block of blocks"
                show-arrow
                :content="block.description"
            >
                <div
                    class="day-block"
                    :style="{ backgroundColor: block.color }"
                ></div>
            </TTooltip>
        </div>
    </div>
</template>

<script lang="ts">
import { Tooltip as TTooltip } from 'tdesign-vue-next';

/** 遍历每个格子 */
function forEachBlock<T>(fun: (week: number, day: number) => T): T[] {
    const result = new Array();
    for (let i = 0; i < 53; ++i)
        for (let j = 0; j <= (i < 52 ? 6 : now.getDay()); ++j)
            result.push(fun(i, j));
    return result;
}

/** 根据坐标推算日期 */
function getDate(i: number, j: number) {
    const date = new Date(firstDay);
    date.setDate(firstDay.getDate() + i * 7 + j);
    return date;
}

const now = new Date(),
    firstDay = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() - now.getDay() - 364
    ),
    colorMin = { r: 0x0e, g: 0x44, b: 0x29 },
    colorMax = { r: 0x39, g: 0xd3, b: 0x53 },
    history = new toolkit.HistoryAnalyzer(toolkit.history.getInLibrary()),
    readingS = forEachBlock((week: number, day: number) =>
        history.getByDate(getDate(week, day))
    ),
    orderlyReadingS = readingS.filter(e => e > 0).sort((l, r) => l - r), // 升序排
    blocks = forEachBlock((week: number, day: number) => {
        function normalize(max: number, min: number, val: number) {
            return (val - min) / (max - min);
        }
        function denormalize(max: number, min: number, per: number) {
            return (max - min) * per + min;
        }
        const index = week * 7 + day;
        let color = '#161b22';
        if (readingS[index] > orderlyReadingS[0]) {
            type RGB = 'r' | 'g' | 'b';
            const percent = normalize(
                    orderlyReadingS.at(-1)!,
                    orderlyReadingS[0],
                    readingS[index]
                ),
                colors = (['r', 'g', 'b'] as RGB[]).map(color => {
                    const str = Math.round(
                        denormalize(colorMin[color], colorMax[color], percent)
                    ).toString(16);
                    return str.length == 1 ? '0' + str : str;
                });
            color = '#' + colors.join('');
        }
        return {
            color,
            description: getDate(week, day).toLocaleDateString(
                toolkit.getGlobal('Zotero').locale
            ),
        };
    });

export default {
    data() {
        return {
            monthStrings: [
                'Jan',
                'Feb',
                'Mar',
                'Apr',
                'May',
                'Jun',
                'Jul',
                'Aug',
                'Sep',
                'Oct',
                'Nov',
                'Dec',
            ],
            now,
            blocks,
        };
    },
};

// import nlp from "compromise/two";
// import nlpStats from "compromise-stats";
// const str = `is a type of word-analysis that can discover the most-characteristic, or unique words in a text. It combines uniqueness of words, and their frequency in the document. This plugin comes pre-built with a standard english model, so you can fingerprint an arbitrary text with`;
// nlp.plugin(nlpStats);
// let doc = nlp(str);
// toolkit.log(nlp, doc);
// // doc.buildIDF(doc);
// toolkit.log(doc.match("#Noun"));
</script>

<style scoped>
.day-block {
    border-radius: 20%;
    transition: all 0.6s;
}

.day-block:hover {
    box-shadow: 0 0 6px gold;
    cursor: pointer;
}

#block-container {
    display: grid;
    grid-auto-flow: column;
    grid-template-rows: repeat(7, 1fr);
    grid-template-columns: repeat(53, 1fr);
    grid-gap: 2px;
    padding: 2px;
    height: 88px;
    width: 640px;
    position: absolute;
    top: 16px;
    left: 38px;
}

#week-layout {
    display: block;
    position: absolute;
    width: 36px;
    top: 20px;
    left: 0;
}

#week-layout > p {
    display: block;
    text-align: right;
    margin: 9px 0 0;
}

.skyline-label {
    font-size: 12px;
    color: #ffffff;
    text-overflow: ellipsis;
}

#month-layout {
    display: flex;
    flex-wrap: nowrap;
    justify-content: space-between;
    position: absolute;
    left: 36px;
    top: 0;
    width: 642px;
}

#month-layout > p {
    display: block;
    margin: 0;
}
</style>
