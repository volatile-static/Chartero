Zotero.Chartero = new function () {
    var readingHistory;  // 统计数据
    var scanPeriod, savePeriod;  // 定时器时间间隔
    var noteItem;  // 存储数据的笔记条目
    var dashboardChart;  // 仪表盘图表对象

    // 根据当前打开的标签页获取阅读器对象
    function getReader() {
        return Zotero.Reader.getByTabID(Zotero_Tabs.selectedID);
    }

    // 在第一次保存数据前准备好笔记条目
    async function setReadingData() {
        if (noteItem)
            return;  // 已经加载过了

        const noteId = Zotero.Prefs.get("chartero.dataID");
        if (noteId)   // 这里是真的没有还是没加载出来？
            noteItem = Zotero.Items.get(noteId);

        if (!readingHistory)
            readingHistory = new HistoryLibrary(Zotero.Libraries.userLibraryID);

        if (noteItem) {  // 合并已有数据
            try {
                var history = JSON.parse(noteItem.getNote());
            } catch (error) {
                if (error instanceof SyntaxError)
                    history = {};
                Zotero.debug(error);
            }
            jQuery.extend(readingHistory, history);  // 会覆盖原有数据！
            return;
        }

        // 新建条目
        noteItem = new Zotero.Item('note');
        let item = new Zotero.Item('computerProgram');

        item.setField('title', 'Chartero');
        item.setField('programmingLanguage', 'JSON');
        item.setField('abstractNote', 'Chartero记录的浏览历史数据。请勿删除本条目！（可以移动、改名）');
        item.setField('url', 'https://github.com/volatile-static');
        item.setCreators([
            {
                fieldMode: 1,
                lastName: "Chartero",
                creatorType: "contributor"
            },
            {
                creatorType: "programmer",
                firstName: "volatile",
                lastName: "static"
            }
        ]);
        noteItem.parentID = await item.saveTx();  // 作为附件

        noteItem.setNote(JSON.stringify(readingHistory));
        Zotero.Prefs.set("chartero.dataID", await noteItem.saveTx());
    }

    this.saveSched = async function () {
        await setReadingData();
        if (getReader()) {  // 将数据存入笔记条目
            noteItem.setNote(JSON.stringify(readingHistory));
            noteItem.saveTx();
        }
    }

    this.scanSched = function () {
        const reader = getReader();
        if (!reader)
            return;  // 不是阅读器页面
        if (!readingHistory)
            readingHistory = new HistoryLibrary(Zotero.Libraries.userLibraryID);

        let item = readingHistory.items[reader.itemID]
        if (!item) {  // 新文件
            // 获取总页数
            const total = reader._iframeWindow.eval('PDFViewerApplication.pdfViewer.pagesCount');
            item = new HistoryItem(total);
        }
        // 获取当前页码
        const pageIndex = reader.state.pageIndex;
        let page = item.p[pageIndex];
        if (!page)  // 新页码
            page = new HistoryPage();

        // 获取时间戳
        const now = new Date();
        page.t[ms2s(now.valueOf())] = ms2s(scanPeriod);  // 单位：秒

        // 写入全局变量，等待保存
        item.p[pageIndex] = page;
        readingHistory.items[reader.itemID] = item;
    };

    this.onItemSelect = async function () {
        const items = ZoteroPane.getSelectedItems();
        if (items.length != 1 || !items[0].isRegularItem()) {
            $('#chartero-item-deck').attr('selectedIndex', 0);
            return;  // TODO: 多合一绘图
        }
        await setReadingData();  // 加载浏览历史

        const item = await items[0].getBestAttachment();
        if (!item || !item.isPDFAttachment() || !readingHistory.items[item.id]) {
            $('#chartero-item-deck').attr('selectedIndex', 0);
            return; // 没有PDF附件或者还没读过
        }
        $('#chartero-item-deck').attr('selectedIndex', 1);

        const history = readingHistory.items[item.id];  // 当前条目的浏览历史
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
        dashboardChart.xAxis[0].setCategories(categories, false);  // x 轴分类
        dashboardChart.series[0].update({
            name: item.getField('title'),
            data: data
        }, false);  // 更新图表
        this.onResize();

        // 显示阅读进度
        const readPages = Object.keys(history.p).length;
        const p = Math.round(readPages * 1000 / history.n / 10);
        $("#reading-progress").animate({value:p});
        $("#reading-progress-lable").attr("value", p + "%");
        $("#chartero-dashboard-read-pages").attr("value", readPages);
        $("#chartero-dashboard-total-pages").attr("value", history.n);
    }

    this.onResize = function (event) {  // 调整图表大小
        const box = document.getElementById("chartero-item-vbox");
        dashboardChart.update({
            chart: {
                zoomType: 'x',
                panning: true,
                panKey: 'shift',
                type: 'bar',  // 指定图表的类型，默认是折线图（line）
                width: box.clientWidth - 20  // 随侧边栏缩放
            },
            exporting: {
                buttons: {
                    contextButton: {
                        symbol: 'menuball',
                        x: 60 - box.clientWidth,
                        menuItems: ["viewFullscreen", "separator", "downloadSVG"]
                    }
                }
            }
        });
    }

    this.notifierCallback = {
        // Check new added item, and adds meta data.
        notify: async function (event, type, ids, extraData) {
            Zotero.log("////////////////////////////////////notify chartero");
            Zotero.log(event);
            Zotero.log(ids);
            Zotero.log(type);
            Zotero.log(extraData);
        },
    };

    this.initCharts = function () {
        // 图表配置
        const options = {
            title: { text: '每页阅读时间' }, // 标题
            xAxis: {},
            yAxis: {
                title: { text: '秒' }  // y 轴标题
            },
            series: [{}]
        };
        // 图表初始化函数
        dashboardChart = Highcharts.chart('chartero-dashboard', options);
    }

    // 设置默认参数
    this.initPrefs = function () {
        scanPeriod = Zotero.Prefs.get("chartero.scanPeriod");
        if (!scanPeriod) {
            scanPeriod = 10000;
            Zotero.Prefs.set("chartero.scanPeriod", scanPeriod);
        }
        setInterval(this.scanSched, scanPeriod);

        savePeriod = Zotero.Prefs.get("chartero.savePeriod");
        if (!savePeriod) {
            savePeriod = 16000;
            Zotero.Prefs.set("chartero.savePeriod", savePeriod);
        }
        setInterval(this.saveSched, savePeriod);
    }

    this.initEvents = function () {
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
        $("#zotero-items-splitter").mouseup(this.onResize);
        const tabbox = document.getElementById("zotero-view-tabbox");

        // https://github.com/dcartertod/zotero-plugins
        Zotero.uiReadyPromise.then(() => {
            ZoteroPane.itemsView.onSelect.addListener(() => {
                const panel = document.getElementById("chartero-item-tabpanel");
                if (tabbox.selectedPanel === panel)
                    this.onItemSelect();
            })
        });
        tabbox.addEventListener("command", (e) => {
            if (e.target.id == "chartero-item-tab")
                this.onItemSelect();
        });
    }

    /**
     * Initiate addon
     */
    this.init = async function () {
        this.initPrefs();
        this.initCharts();
        this.initEvents();
    };
}
