Zotero.Chartero = new function () {
    this.readingHistory = false;  // 统计数据
    var scanPeriod, savePeriod;  // 定时器时间间隔
    var noteItem;  // 存储数据的笔记条目
    var isReaderActive;

    this.showMessage = function(msg, ico) {
        const popMsg = new Zotero.ProgressWindow();
        popMsg.changeHeadline('', 'chrome://chartero/skin/icon.png', 'Chartero');
        popMsg.addDescription('‾‾‾‾‾‾‾‾‾‾‾‾');
        const path = typeof ico === 'string' ? 
            'chrome://chartero/skin/' + ico + '.png' : 
            'chrome://zotero/skin/cross.png';
        let prog = new popMsg.ItemProgress(path, msg);
        prog.setProgress(100);
        popMsg.show();
        popMsg.startCloseTimer(6666);
    }

    // 根据当前打开的标签页获取阅读器对象
    function getReader() {
        return Zotero.Reader.getByTabID(Zotero_Tabs.selectedID);
    }

    // 在第一次保存数据前准备好笔记条目
    async function setReadingData() {
        if (noteItem)
            return;  // 已经加载过了

        const noteKey = Zotero.Prefs.get("chartero.dataKey");
        if (noteKey)   // 这里是真的没有还是没加载出来？
            noteItem = Zotero.Items.getByLibraryAndKey(
                Zotero.Libraries.userLibraryID,  // 哪个libraries？
                noteKey
            );

        if (!this.readingHistory)
            this.readingHistory = new HistoryLibrary(Zotero.Libraries.userLibraryID);

        if (noteItem) {  // 合并已有数据
            try {
                var history = JSON.parse(noteItem.getNote());
            } catch (error) {
                if (error instanceof SyntaxError)
                    history = {};
                Zotero.debug(error);
            }
            this.readingHistory.mergeJSON(history);
            return;
        }

        Zotero.Chartero.showMessage('No history found!', 'exclamation');
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

        noteItem.setNote(JSON.stringify(this.readingHistory));
        await noteItem.saveTx();
        Zotero.Prefs.set("chartero.dataKey", noteItem.key);
    }

    async function hasRead(item) {
        await setReadingData();  // 加载浏览历史
        var pdf = await item.getBestAttachment();
        if (!pdf || !pdf.isPDFAttachment() || !this.readingHistory.items[pdf.key])
            return false; // 没有PDF附件或者还没读过
        else
            return pdf;
    }

    this.saveSched = async function () {
        await setReadingData();
        if (getReader()) {  // 将数据存入笔记条目
            noteItem.setNote(JSON.stringify(this.readingHistory));
            noteItem.saveTx();
        }
    }

    this.scanSched = function () {
        const reader = getReader();
        if (!isReaderActive || !reader)
            return;  // 没在阅读中
        if (!this.readingHistory)
            this.readingHistory = new HistoryLibrary(Zotero.Libraries.userLibraryID);

        const key = Zotero.Items.get(reader.itemID).key;
        let item = this.readingHistory.items[key];
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
        this.readingHistory.items[key] = item;
    };

    function updateTabPanel(item) {
        $('#chartero-item-deck').attr('selectedIndex', 1);
        let f = document.getElementById('chartero-data-iframe');
        f.contentWindow.postMessage({
            history: this.readingHistory.items[item.key],  // 当前条目的浏览历史
            title: item.getField('title')
        }, '*');
    }

    async function showDataTree() {
        const pane = document.getElementById('zotero-item-pane-content');
        const frame = document.getElementById('chartero-data-viewer');
        pane.selectedPanel = frame;

        await setReadingData();
        frame.contentWindow.postMessage(noteItem.getNote(), '*');
    }

    function selectLibrary(id) {
    }

    function selectCollection(collection) {
        const items = collection.getChildItems();
        for (const i of items) {
            // Zotero.log(i.id);
        }
    }

    function selectSearch(search) {
    }

    this.onCollectionSel = function () {
        const row = ZoteroPane.getCollectionTreeRow();
        if (row.isLibrary(false))
            selectLibrary(row.ref.libraryID)
        else if (row.isCollection())
            selectCollection(row.ref)
        else if (row.isSearch())
            selectSearch(row.ref)
        else {
        }
    }

    this.onItemSelect = async function () {
        const items = ZoteroPane.getSelectedItems();

        if (items.length != 1)
            return;  // TODO: 多合一绘图
        else if (items[0].key == Zotero.Prefs.get("chartero.dataKey")) {
            showDataTree();
            return;
        } else if (!items[0].isRegularItem())
            return;
        else {
            const tabbox = document.getElementById("zotero-view-tabbox");
            if (tabbox.selectedTab.id != 'chartero-item-tab')
                return;
        }

        const item = await hasRead(items[0]);
        if (item)
            updateTabPanel(item);
        else // 没有PDF附件或者还没读过
            $('#chartero-item-deck').attr('selectedIndex', 0);
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

    // 弹出对话框输入JSON合并到原有历史记录
    function messageHandler() {
        let prompts = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
            .getService(Components.interfaces.nsIPromptService);
        let check = { value: false };
        let input = { value: "{}" };

        if (prompts.prompt(null, "Chartero", "Paste your JSON here.", input, null, check)) {
            try {
                const obj = JSON.parse(input.value);
                this.readingHistory.mergeJSON(obj);
            } catch (error) {
                Zotero.debug(error);
                if (error instanceof SyntaxError)
                    Zotero.Chartero.showMessage('Invalid JSON!');  // why not this.?
                else if (typeof error === 'string')
                    Zotero.Chartero.showMessage(error);
                return;
            }
            noteItem.setNote(JSON.stringify(this.readingHistory));
            noteItem.saveTx();
            Zotero.Chartero.showMessage('History saved!', 'information');
        }
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

        window.addEventListener('message', messageHandler, false);
        window.addEventListener('activate', () => {
            isReaderActive = true;
        }, true);
        window.addEventListener('deactivate', () => {
            isReaderActive = false;
        }, true);

        $("#zotero-items-splitter").mouseup(this.onResize);
        const tabbox = document.getElementById("zotero-view-tabbox");

        // https://github.com/dcartertod/zotero-plugins
        Zotero.uiReadyPromise.then(() => {
            ZoteroPane.itemsView.onSelect.addListener(this.onItemSelect);
            ZoteroPane.collectionsView.onSelect.addListener(this.onCollectionSel);
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
        this.initEvents();
    };

    this.refreshItemsProgress = async function () {
        await setReadingData();
        const raw = noteItem.getNote();
        const his = new HistoryLibrary(1);  // TODO: this.readingHistory
        his.mergeJSON(JSON.parse(raw)); 
        ZoteroPane.itemsView.collapseAllRows();  // 附件上不显示

        let flag = false;
        for (let i = 0; i < ZoteroPane.itemsView.rowCount; ++i) {
            const title = $(`#item-tree-main-default-row-${i}`).find('.title');
            const item = Zotero.Items.getByLibraryAndKey(
                his.lib,
                ZoteroPane.itemsView.getRow(i).ref.key  // 第i行item的key
            );
            
            if (!item.isRegularItem())
                continue;
            const pdf = await hasRead(item);  // 是否读过
            if (!pdf)
                continue;
            const history = his.items[pdf.key];
            const readPages = Object.keys(history.p).length;
            const p = Math.round(readPages * 1000 / history.n / 10);  // 百分比，整数

            switch (parseInt(p / 25)) {
                case 0:  // 小于25%
                    title.after('🔴');
                    break;
                case 1:  // 25% ~ 50%
                    title.after('🟠');
                    break;
                case 2:  // 50% ~ 75%
                    title.after('🟡');
                    break;
                case 3:  // 75% ~ 99%
                    title.after('🟢');
                    break;
                case 4:  // 100%（页数多时可能有一两页没读）
                    title.after('💯');
                    break;
                default:
                    break;
            }
            flag = true;
        }
        if (!flag)
            this.showMessage('No history found in items pane.', 'exclamation');
    };

    this.newTab = function () {
        let { id, container } = Zotero_Tabs.add({
            type: "library",
            title: "Chartero",
            data: {},
            select: true,
            onClose: undefined,
        });
        let f = document.createElement('iframe');
        f.setAttribute('src', 'chrome://chartero/content/Overview/index.html');
        container.appendChild(f);

    }
}
