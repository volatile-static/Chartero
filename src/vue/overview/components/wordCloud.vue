<script setup lang="ts">
import type Highcharts from '../../utility/highcharts';
import { Chart } from 'highcharts-vue';
import { onMounted, ref } from 'vue';

const chart = ref<Highcharts.Chart | null>(null);

onMounted(() => {
    toolkit.log(chart.value?.options);
});
</script>

<template>
    <!-- <Chart :constructorType="'chart'" ref="chart" :options="networkOptions()"></Chart> -->
</template>
