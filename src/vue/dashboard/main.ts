import { createApp } from "vue";
import App from "./dashboard.vue";
import HighchartsVue from "highcharts-vue";
import Highcharts from "highcharts";
import Gantt from "highcharts/modules/gantt";
import DarkUnica from "highcharts/themes/dark-unica"
Gantt(Highcharts);
DarkUnica(Highcharts);

//@ts-ignore
createApp(App).use(HighchartsVue).mount('#app')
