var chartPageTime, chartDateTime;

function setReadingProgress(read, total) {
  // 计算阅读进度百分比
  const p = Math.round(read * 1000 / total / 10);
  // alert(`${read} ${total} ${p}`)
  $('.wave-change').animate({ top: 40 - p });
  $('#reading-progress-label').html(p + '%');
  $('#reading-pages').html(read);
  $('#reading-total').html(total);
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
      data.push(page_getTotalSeconds(history.p[i]))
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
  const firstTime = item_firstTime(history);
  const lastTime = item_lastTime(history);
  const categories = new Array();
  const data = new Array();
  
  // 遍历每天
  for (let i = firstTime; i <= lastTime; i += 86400) {
    categories.push((new Date(i * 1000)).toLocaleDateString());
    data.push(item_getDateTime(history, i * 1000));
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
    title: { text: '每页阅读时长' }, // 标题
    credits: { enabled: false },
    xAxis: {},
    yAxis: {
      title: { text: '秒' }  // y 轴标题
    },
    series: [{}]
  };
  // 图表初始化函数
  chartPageTime = Highcharts.chart('page-time-chart', options);

  options.title.text = '每日阅读时长';
  options.xAxis = { title: { text: '日期' } };
  options.yAxis.title.text = '秒';
  options.chart.type = 'line';
  chartDateTime = Highcharts.chart('date-time-chart', options);
}

function handler(event) {
  const history = event.data.history;
  setReadingProgress(Object.keys(history.p).length, history.n);
  plotPageTime(history, event.data.title);
  plotDateTime(history, event.data.title);
}

window.addEventListener('DOMContentLoaded', () => {
  $('#accordion').accordion({
    heightStyle: "content",
    collapsible: true
  });
  initCharts();
  window.addEventListener('message', handler, false);
})
