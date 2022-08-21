Zotero.Chartero = new function () {
    var readingSummary;
    var interval;

    this.onTime = function () {
        // 根据当前打开的标签页获取阅读器对象
        const reader = Zotero.Reader.getByTabID(Zotero_Tabs.selectedID);
        if (!reader)
            return;  // 不是阅读器页面

        // 获取当前页码与文档标题
        const pageIndex = reader.state.pageIndex;
        const item = Zotero.Items.get(reader.itemID);
        // const top = Zotero.Items.get(item.parentItemID);

        if (!readingSummary[item.key])  // 新文件
            readingSummary[item.key] = {};

        if (!readingSummary[item.key][pageIndex])  // 新页码
            readingSummary[item.key][pageIndex] = interval / 1000;
        else
            readingSummary[item.key][pageIndex] += interval / 1000;

        const text = JSON.stringify(readingSummary);
        Zotero.Prefs.set("chartero.data", text);
    };

    this.onItemSelect = function (event) {
        if (event.target.id != "chartero-item-tab")
            return;
        const items = ZoteroPane.getSelectedItems();
        if (items.length != 1 || !items[0].isRegularItem())
            return;  // TODO: multi-charts
        let item;
        const attachment =
            Zotero.Items.get(items[0].getAttachments()).find((att) => att.isPDFAttachment());
        if (attachment) {
            item = attachment;
        } else return;
        if (!readingSummary[item.key])  // 还没读过
            return;

        let max = 0;
        for (const i in readingSummary[item.key]) 
            max = Math.max(max, readingSummary[item.key][i]);

        let categories = new Array();
        let data = new Array();

        for (let i = 1; i <= max; ++i) {
            categories.push(i);
            if (readingSummary[item.key][i])
                data.push(readingSummary[item.key][i])
            else
                data.push(0);
        }

        // 图表配置
        let options = {
            chart: {
                type: 'bar'                          //指定图表的类型，默认是折线图（line）
            },
            title: {
                text: '每页阅读时间'                 // 标题
            },
            xAxis: {
                categories: categories   // x 轴分类
            },
            yAxis: {
                title: {
                    text: '秒'                // y 轴标题
                }
            },
            series: [{
                data: data
            }]
        };
        // 图表初始化函数
        const chart = Highcharts.chart('chartero-dashboard', options);
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

    /**
     * Initiate addon
     */
    this.init = async function () {
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

        const tabbox = document.getElementById("zotero-view-tabbox");
        tabbox.addEventListener("command", this.onItemSelect);

        interval = Zotero.Prefs.get("chartero.interval");
        if (!interval) {
            interval = 1000;
            Zotero.Prefs.set("chartero.interval", interval);
        }
        setInterval(this.onTime, interval);

        let jsonText = Zotero.Prefs.get("chartero.data");
        if (!jsonText)
            jsonText = "{}";
        readingSummary = JSON.parse(jsonText);

    };
}
