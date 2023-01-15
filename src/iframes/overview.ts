declare const Highcharts: typeof import("../modules/highcharts").default;
import networkOptions from "../charts/network";

window.addEventListener('DOMContentLoaded', () => {
  Highcharts.chart('hc', networkOptions());
  
});

