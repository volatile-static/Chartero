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
                {{ monthStrings[now.getMonth() + month] }}
            </p>
        </div>
        <div>
            <div v-for="week in 51" style="float: left">
                <TTooltip
                    v-for="day in 7"
                    show-arrow
                    :content="`week-${week}-day-${day}`"
                >
                    <div
                        :id="`week-${week}-day-${day}`"
                        class="day-block"
                    ></div>
                </TTooltip>
            </div>
        </div>
    </div>
</template>

<script lang="ts">
import { Tooltip as TTooltip } from 'tdesign-vue-next';
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
            now: new Date(),
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
    width: 8px;
    height: 8px;
    margin: 2px;
    border-radius: 20%;
    transition: all 0.6s;
    background-color: #161b22;
}

.day-block:hover {
    box-shadow: 0 0 6px gold;
    cursor: pointer;
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
