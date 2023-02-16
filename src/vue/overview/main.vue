<script setup lang="ts">
import WordCloud from './components/wordCloud.vue';
import SkyLine from './components/skyline.vue';
</script>

<script lang="ts">
const list: any = [];
for (let i = 0; i < 20; i++) {
    list.push({
        value: i.toString(),
        label: `内容${i + 1}`,
    });
}

export default {
    data() {
        return {
            chartOptions: {
                title: {
                    text: 'Gantt Chart with Progress Indicators',
                },
                xAxis: {
                    min: Date.UTC(2014, 10, 17),
                    max: Date.UTC(2014, 10, 30),
                },

                series: [
                    {
                        name: 'Project 1',
                        data: [
                            {
                                name: 'Start prototype',
                                start: Date.UTC(2014, 10, 18),
                                end: Date.UTC(2014, 10, 25),
                                completed: 0.25,
                            },
                            {
                                name: 'Test prototype',
                                start: Date.UTC(2014, 10, 27),
                                end: Date.UTC(2014, 10, 29),
                            },
                            {
                                name: 'Develop',
                                start: Date.UTC(2014, 10, 20),
                                end: Date.UTC(2014, 10, 25),
                                completed: {
                                    amount: 0.12,
                                    fill: '#fa0',
                                },
                            },
                            {
                                name: 'Run acceptance tests',
                                start: Date.UTC(2014, 10, 23),
                                end: Date.UTC(2014, 10, 26),
                            },
                        ],
                    },
                ],
            },
            history: toolkit.history.getInLibrary()[0],
        };
    },
    methods: {
        onClk() {
            toolkit.log(this);
            document.documentElement.setAttribute('theme-mode', 'dark');
        },
    },
};
</script>

<template>
    <header>
        <!-- <WordCloud></WordCloud> -->
        <SkyLine></SkyLine>
    </header>
</template>

<style scoped>
header {
    line-height: 1.5;
    height: 100%;
    background-color: var(--td-mask-active);
}

@media (min-width: 1024px) {
    header {
        display: flex;
        place-items: center;
        padding-right: calc(var(--section-gap) / 2);
    }

    header .wrapper {
        display: flex;
        place-items: flex-start;
        flex-wrap: wrap;
    }
}
</style>
