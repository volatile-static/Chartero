<script setup lang="ts">
import "tdesign-vue-next/es/style/index.css";
import Highcharts from "../components/highcharts";
import { Button as TButton, Transfer as TTransfer } from 'tdesign-vue-next';
</script>

<script lang="ts">
import { ref } from 'vue';

const list:any = [];
for (let i = 0; i < 20; i++) {
  list.push({
    value: i.toString(),
    label: `内容${i + 1}`,
  });
}

const targetValue = ref([]);
export default {
  data() {
    return {
      chartOptions: {
        title: {
          text: "Gantt Chart with Progress Indicators"
        },
        xAxis: {
          min: Date.UTC(2014, 10, 17),
          max: Date.UTC(2014, 10, 30)
        },

        series: [
          {
            name: "Project 1",
            data: [
              {
                name: "Start prototype",
                start: Date.UTC(2014, 10, 18),
                end: Date.UTC(2014, 10, 25),
                completed: 0.25
              },
              {
                name: "Test prototype",
                start: Date.UTC(2014, 10, 27),
                end: Date.UTC(2014, 10, 29)
              },
              {
                name: "Develop",
                start: Date.UTC(2014, 10, 20),
                end: Date.UTC(2014, 10, 25),
                completed: {
                  amount: 0.12,
                  fill: "#fa0"
                }
              },
              {
                name: "Run acceptance tests",
                start: Date.UTC(2014, 10, 23),
                end: Date.UTC(2014, 10, 26)
              }
            ]
          }
        ]
      }
    };
  }
};
</script>

<template>
  <header>
    <t-transfer v-model="targetValue" theme="primary" :data="list" :search="true" />
    <div class="wrapper">
      <hello-world msg="You did it!" />

      <t-button theme="primary" variant="base">2填充按钮</t-button>
      <t-button theme="success" variant="outline">描边按钮</t-button>
      <t-button theme="warning" variant="dashed">虚框按钮</t-button>
      <t-button theme="default" variant="text">文字按钮</t-button>


    </div>
    <div :style="{ display: 'flex' }">
      <highcharts :constructorType="'ganttChart'" class="hc" :options="chartOptions" ref="chart"></highcharts>
    </div>
  </header>

</template>

<style scoped>
header {
  line-height: 1.5;
  max-height: 100vh;
}

.logo {
  display: block;
  margin: 0 auto 2rem;
}

nav {
  width: 100%;
  font-size: 12px;
  text-align: center;
  margin-top: 2rem;
}

nav a.router-link-exact-active {
  color: var(--color-text);
}

nav a.router-link-exact-active:hover {
  background-color: transparent;
}

nav a {
  display: inline-block;
  padding: 0 1rem;
  border-left: 1px solid var(--color-border);
}

nav a:first-of-type {
  border: 0;
}

@media (min-width: 1024px) {
  header {
    display: flex;
    place-items: center;
    padding-right: calc(var(--section-gap) / 2);
  }

  .logo {
    margin: 0 2rem 0 0;
  }

  header .wrapper {
    display: flex;
    place-items: flex-start;
    flex-wrap: wrap;
  }

  nav {
    text-align: left;
    margin-left: -1rem;
    font-size: 1rem;

    padding: 1rem 0;
    margin-top: 1rem;
  }
}
</style>
