Zotero.Chartero = new function () {
    var readingSummary;  // json格式的统计数据
    var interval;  // 定时器时间间隔
    var dashboardChart;  // 仪表盘图表对象

    this.onTime = function () {
        // 根据当前打开的标签页获取阅读器对象
        const reader = Zotero.Reader.getByTabID(Zotero_Tabs.selectedID);
        if (!reader)
            return;  // 不是阅读器页面

        // 获取当前页码
        const pageIndex = reader.state.pageIndex;
        // 获取总页数
        const pagesCount = reader._iframeWindow.eval('PDFViewerApplication.pdfViewer.pagesCount');
        // 获取条目
        const item = Zotero.Items.get(reader.itemID);
        // const top = Zotero.Items.get(item.parentItemID);

        if (!readingSummary[item.key])  // 新文件
            readingSummary[item.key] = { n : pagesCount };

        if (!readingSummary[item.key][pageIndex])  // 新页码
            readingSummary[item.key][pageIndex] = interval / 1000;
        else
            readingSummary[item.key][pageIndex] += interval / 1000;

        const text = JSON.stringify(readingSummary);
        Zotero.Prefs.set("chartero.data", text);
    };

    this.onItemSelect = async function () {
        const items = ZoteroPane.getSelectedItems();
        if (items.length != 1 || !items[0].isRegularItem())
            return;  // TODO: 多合一绘图
        const item = await items[0].getBestAttachment();
        if (!item || !item.isPDFAttachment() || !readingSummary[item.key])
            return; // 没有PDF附件或者还没读过

        const summary = readingSummary[item.key];
        // 寻找页码范围
        let max = 0;
        for (const i in summary)
            max = Math.max(max, i);
        let min = max;
        for (const i in summary)
            min = Math.min(min, i);

        let categories = new Array();
        let data = new Array();
        // 填充作图数据
        for (let i = min; i <= max; ++i) {
            categories.push(i);
            if (summary[i])
                data.push(summary[i])
            else
                data.push(0);
        }
        dashboardChart.xAxis[0].setCategories(categories); // x 轴分类
        dashboardChart.series[0].update({
            name: item.getField('title'),
            data: data
        });  // 更新图表

        Zotero.log(summary);
        // 显示阅读进度
        const p = Math.round((Object.keys(summary).length - 1) * 1000 / summary.n / 10)
        document.getElementById("reading-progress").setAttribute("value", p + "%");
    }

    this.notifierCallback = {
        // Check new added item, and adds meta data.
        notify: async function (event, type, ids, extraData) {
            Zotero.log("////////////////////////////////////notify chartero");
            Zotero.log(event);
            Zotero.log(ids);
            Zotero.log(extraData);
        },
    };

    this.initCharts = function () {
        // 图表配置
        const options = {
            chart: {
                zoomType: 'x',
                panning: true,
                panKey: 'shift',
                type: 'bar'  // 指定图表的类型，默认是折线图（line）
            },
            title: { text: '每页阅读时间' }, // 标题
            xAxis: {},
            yAxis: {
                title: { text: '秒' }  // y 轴标题
            },
            series: [{}],
        };
        // 图表初始化函数
        dashboardChart = Highcharts.chart('chartero-dashboard', options);
    }

    /**
     * Initiate addon
     */
    this.init = async function () {
        pdfjsLib.GlobalWorkerOptions.workerSrc =
            "resource://zotero/pdf-reader/pdf.worker.js";

        // 注册监听器
        const notifierID = Zotero.Notifier.registerObserver(
            this.notifierCallback,
            ["item", "tab"]
        );
        // Unregister callback when the window closes (important to avoid a memory leak)
        window.addEventListener(
            "unload",
            function (e) {
                Zotero.Notifier.unregisterObserver(notifierID);
            },
            false
        );

        // 设置默认参数
        interval = Zotero.Prefs.get("chartero.interval");
        if (!interval) {
            interval = 10000;
            Zotero.Prefs.set("chartero.interval", interval);
        }
        setInterval(this.onTime, interval);
        const jsonText = Zotero.Prefs.get("chartero.data");
        if (!jsonText)
            jsonText = "{}";
        readingSummary = JSON.parse(jsonText);

        this.initCharts();

        const tabbox = document.getElementById("zotero-view-tabbox");
        // https://github.com/dcartertod/zotero-plugins
        Zotero.uiReadyPromise.then(() => {
            ZoteroPane.itemsView.onSelect.addListener(() => {
                const panel = document.getElementById("chartero-item-tabpanel");
                const index = Array.prototype.indexOf.call(
                    panel.parentNode.childNodes,
                    panel
                );
                if (tabbox.selectedIndex === index)
                    this.onItemSelect();
            })
        });
        tabbox.addEventListener("command", (e) => {
            if (e.target.id == "chartero-item-tab")
                this.onItemSelect();
        });
    };
}
