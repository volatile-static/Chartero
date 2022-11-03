const localeStr = require('chrome://chartero/locale/tabpanel.json');
var chartPageTime, chartDateTime, chartNetwork, readingHistory = new HistoryLibrary();

async function getHis(parent) {  // 获取顶层条目的阅读总时长
  const pdf = await parent.getBestAttachment();
  return pdf && pdf.isPDFAttachment() &&
    readingHistory.items[pdf.key] &&
    readingHistory.items[pdf.key].getTotalSeconds();
}

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

async function plotNetwork(item) {
  const data = new Array(), nodes = new Object(), edges = new Object();
  function dfs(it) {
    nodes[it.key] = true;  // 访问该节点
    for (key of it.relatedItems) {
      const t = Zotero.Items.getByLibraryAndKey(1, key);  // 1
      if (!edges[`${t.id},${it.id}`])  // 已经有反向边了
        data.push([it.id, t.id]);
      edges[`${it.id},${t.id}`] = true;  // 加边
      if (!nodes[key])
        dfs(t);  // 递归
    }
  }
  if (!item)
    return;
  dfs(item);

  console.log(nodes, edges);
  const items = Object.keys(nodes).map(key => Zotero.Items.getByLibraryAndKey(1, key));
  let totalTimes = [], k2t = {};
  for (const it of items) {
    const his = await getHis(it);
    totalTimes.push(his || 0);
    k2t[it.key] = his || 0;
  }
  totalTimes = totalTimes.sort();
  const minTime = totalTimes[0], maxTime = totalTimes[totalTimes.length - 1];

  for (const key in k2t)
    k2t[key] = Math.abs((k2t[key] - minTime) / (maxTime - minTime + 1)) * 39 + 20;

  while (chartNetwork.series.length > 0)
    chartNetwork.series[0].remove(false);  // 删除原有序列

  chartNetwork.addSeries({
    type: 'networkgraph',
    name: '关联文献',
    // showInLegend: true,
    point: {
      events: {
        click: function (event) {
          if (event.ctrlKey)
            Zotero.Chartero.viewItemInLib(this.id);
        }
      }
    },
    link: { width: 6 },
    nodes: items.map(it => {
      return {
        name: it.getField('title'),
        id: it.id,
        marker: {
          radius: k2t[it.key]
          // symbol: `url(${it.getImageSrc()})`,
          // width: k2t[it.key],
          // height: k2t[it.key]
        },
        // dataLabels: {
        //   enabled: it.id == item.id,
        //   format: '当前条目'
        // },
        // mass: k2t[it.key],
        selected: it.id == item.id  // 突出显示当前条目
      };
    }),
    data
  });
}

function initCharts() {
  Highcharts.setOptions({
    chart: { style: { fontFamily: "" } },
    credits: { enabled: false },
  });
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
    xAxis: { title: { text: localeStr['pagenum'] } },
    yAxis: {
      labels: {
        formatter: function () {
          const tim = s2hour(this.value);
          let lbl = '';
          if (tim.hour)
            lbl = tim.hour + localeStr['hours'];
          if (tim.minute)
            lbl += tim.minute + localeStr['minutes'];
          if (lbl.length < 1)
            lbl = this.value + localeStr['seconds'];
          else if (!tim.hour && tim.second)
            lbl += tim.second + localeStr['seconds'];
          return lbl;
        }
      },
      title: { text: localeStr['time'] }  // y 轴标题
    },
    series: [{}]
  };
  // 图表初始化函数
  chartPageTime = Highcharts.chart('page-time-chart', options);

  options.title.text = localeStr['dateTimeTitle'];
  options.xAxis.title.text = localeStr['date'];
  options.chart.type = 'line';
  chartDateTime = Highcharts.chart('date-time-chart', options);

  chartNetwork = Highcharts.chart('network-chart', {
    title: { text: undefined },
    subtitle: { text: 'Ctrl+单击 跳转' },
    plotOptions: {
      networkgraph: {
        layoutAlgorithm: {
          enableSimulation: true
        }
      }
    }
  });
}

function handler(event) {
  readingHistory.mergeJSON(event.data.history);
  const item = Zotero.Items.get(event.data.id),
    history = readingHistory.items[item.key],
    title = (item.parentItem || item).getField('title');
  setReadingProgress(history);
  plotPageTime(history, title);
  plotDateTime(history, title);
  plotNetwork(item.parentItem);
}

window.addEventListener('DOMContentLoaded', () => {
  $('#accordion').accordion({
    heightStyle: "content",
    collapsible: true,
    activate: function (event, ui) {
      ui.newPanel && $(ui.newPanel).highcharts() &&
        $(ui.newPanel).highcharts().reflow();
    }
  });
  $('#reading-progress-container').tooltip({
    content: localeStr['readingProgressTip'],
    items: 'p'
  });
  initCharts();
  window.addEventListener('message', handler, false);
})
