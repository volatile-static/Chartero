const localeStr = require('chrome://chartero/locale/tabpanel.json');
var chartPageTime, chartDateTime;

function setReadingProgress(his) {
  const p = his.getProgress(100, 2);
  $('.wave-change').animate({ top: 40 - p });
  $('#reading-progress-label').html(p + '%');
  $('#reading-pages').html(his.getRead());
  $('#reading-total').html(his.n);
}

function plotPageTime(history, title) {
  // 寻找页码范围
  let max = 0;
  for (const i in history.p)
    if (!isNaN(i))
      max = Math.max(max, i);
  let min = max;
  for (const i in history.p)
    if (!isNaN(i))
      min = Math.min(min, i);

  let categories = new Array();
  let data = new Array();
  // 填充作图数据
  for (let i = min; i <= max; ++i) {
    categories.push(i);
    if (history.p[i])
      data.push(history.p[i].getTotalSeconds())
    else
      data.push(0);
  }
  chartPageTime.xAxis[0].setCategories(categories, false);  // x 轴分类
  chartPageTime.series[0].update({
    name: title,
    data: data
  });  // 更新图表
}

function plotDateTime(history, title) {
  const firstTime = history.firstTime();
  const lastTime = history.lastTime();
  const categories = new Array();
  const data = new Array();
  
  // 遍历每天
  for (let i = firstTime; i <= lastTime; i += 86400) {
    categories.push((new Date(i * 1000)).toLocaleDateString());
    data.push(history.getDateTime(i * 1000));
  }
  chartDateTime.xAxis[0].setCategories(categories, false);
  chartDateTime.series[0].update({
    name: title,
    data: data
  });
}

function initCharts() {
  // 图表配置
  let options = {
    chart: {
      style: { fontFamily: "", },
      zoomType: 'x',
      panning: true,
      panKey: 'shift',
      borderRadius: 6,
      type: 'bar',  // 指定图表的类型，默认是折线图（line）
    },
    legend: { enabled: false },
    title: { text: localeStr['pageTimeTitle'] }, // 标题
    credits: { enabled: false },
    xAxis: {},
    yAxis: {
      title: { text: localeStr['seconds'] }  // y 轴标题
    },
    series: [{}]
  };
  // 图表初始化函数
  chartPageTime = Highcharts.chart('page-time-chart', options);

  options.title.text = localeStr['dateTimeTitle'];
  options.xAxis = { title: { text: localeStr['date'] } };
  options.yAxis.title.text = localeStr['seconds'];
  options.chart.type = 'line';
  chartDateTime = Highcharts.chart('date-time-chart', options);
  // $('#date-time-radio').controlgroup();
}

function handler(event) {
  const history = new HistoryItem();
  history.mergeJSON(event.data.history);
  setReadingProgress(history);
  plotPageTime(history, event.data.title);
  plotDateTime(history, event.data.title);
}

window.addEventListener('DOMContentLoaded', () => {
  $('#accordion').accordion({
    heightStyle: "content",
    collapsible: true,
    activate: function (event, ui) {
      ui.newPanel && $(ui.newPanel).highcharts().reflow();
    }
  });
  $('#reading-progress-container').tooltip({ 
    content: localeStr['readingProgressTip'],
    items: 'p'
  });
  initCharts();
  window.addEventListener('message', handler, false);
})
