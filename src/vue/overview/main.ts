import { createApp } from "vue";
import App from "./overview.vue";
import Highcharts from "../components/highcharts";
import HighchartsVue from "highcharts-vue";

//@ts-ignore
createApp(App).use(HighchartsVue).mount('#app')
