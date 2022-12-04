Zotero.Chartero = new function () {
    this.readingHistory = false;  // 统计数据
    var showReadingProgress = false;  // 是否在条目标题下显示高能进度条
    var scanPeriod, savePeriod;  // 定时器时间间隔
    var scanInt, saveInt;  // 回调函数ID，用于暂停记录
    var noteItem;  // 存储数据的笔记条目
    const state = {  // 用来防止挂机
        active: false,
        page: 0,
        count: 0,
        position: 0
    };

    // 右下角显示弹出消息
    this.showMessage = function (msg, ico) {
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
        if (this.readingHistory)
            return this.readingHistory;  // 已经加载过了
        if (!noteItem) {
            const noteKey = Zotero.Prefs.get("chartero.dataKey");
            if (noteKey)   // 这里是真的没有还是没加载出来？
                noteItem = Zotero.Items.getByLibraryAndKey(
                    Zotero.Libraries.userLibraryID,  // 哪个libraries？
                    noteKey
                );
            else {  // 新建条目
                Zotero.Chartero.showMessage('No history found!', 'exclamation');
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
        }
        this.readingHistory = new HistoryLibrary(Zotero.Libraries.userLibraryID);
        try {  // 合并已有数据
            var history = JSON.parse(noteItem.getNote());
        } catch (error) {
            if (error instanceof SyntaxError)
                history = {};
            this.showMessage('数据格式错误！');
        } finally {
            this.readingHistory.mergeJSON(history);
            return this.readingHistory;
        }
    }

    // 若读过则返回PDF条目
    async function hasRead(item) {
        await setReadingData();  // 加载浏览历史
        var pdf = await item.getBestAttachment();
        if (!pdf || !pdf.isPDFAttachment() || !this.readingHistory.items[pdf.key])
            return false; // 没有PDF附件或者还没读过
        else
            return pdf;
    }

    // 保存浏览记录
    this.saveSched = async function () {
        await setReadingData();
        if (getReader()) {  // 将数据存入笔记条目
            noteItem.setNote(JSON.stringify(this.readingHistory));
            noteItem.saveTx();
        }
    }

    // 记录浏览历史
    this.scanSched = async function () {
        const reader = getReader();
        if (!state.active || !reader || !reader.state)
            return;  // 没在阅读中
        // 获取当前页码
        const pageIndex = reader.state.pageIndex;

        if (pageIndex == state.page) {
            if (reader.state.top == state.position)
                ++state.count;
            else {
                state.position = reader.state.top;
                state.count = 0;
            }
        } else {
            state.page = pageIndex;
            state.count = 0;
        }
        if (state.count > 60)
            return;  // 离开了

        await setReadingData();
        const it = Zotero.Items.get(reader.itemID), key = it.key;
        if (it.libraryID != this.readingHistory.lib)
            return;  // 暂时不处理群组文献
        let item = this.readingHistory.items[key];
        if (!item) {  // 新文件
            // 获取总页数
            const total = reader._iframeWindow.wrappedJSObject
                .PDFViewerApplication.pdfDocument.numPages;
            item = new HistoryItem(total);
        }
        let page = item.p[pageIndex];
        if (!page)  // 新页码
            page = new HistoryPage();

        // 获取时间戳
        const now = new Date();
        page.t[ms2s(now.valueOf())] = ms2s(scanPeriod);  // 单位：秒

        // 写入全局变量，等待保存
        item.p[pageIndex] = page;
        this.readingHistory.items[key] = item;

        const dashboard = document.getElementById(
            'chartero-real-time-dashboard-' + Zotero_Tabs.selectedID
        ), panel = dashboard.parentElement;
        dashboard &&
            panel.parentElement.selectedPanel == panel &&
            dashboard.contentWindow.postMessage({
                history: this.readingHistory,  // 当前条目的浏览历史
                id: it.id
            }, '*');
    };

    // 右侧边栏的仪表盘
    function updateTabPanel(item) {
        $('#chartero-item-deck').attr('selectedIndex', 1);
        let f = document.getElementById('chartero-data-iframe');
        f.contentWindow.postMessage({
            history: this.readingHistory,  // 当前条目的浏览历史
            id: item.id
        }, '*');
    }

    // 显示- 阅读高能进度条
    async function refreshItemsProgress() {
        function renderProgress(primaryCell, history) {  // 渲染标题下的高能进度条
            // Use this function to create an element, otherwise the style will not take effect
            const createElement = name =>
                document.createElementNS("http://www.w3.org/1999/xhtml", name),
                progressNode = createElement("span");
            progressNode.setAttribute("class", "zotero-style-progress");
            // setting - opacity
            progressNode.style = `
                position: absolute;
                left: 3.25em;
                top: 0;
                width: 90%;
                height: 100%;
                opacity: .7;
                z-index: 1;
            `;
            // render the read progress
            primaryCell.style = `
                position: relative;
                box-sizing: border-box;
            `;
            primaryCell.appendChild(progressNode);
            // prevent occlusion
            primaryCell.querySelector(".cell-text").style.zIndex = 2;

            // analysis history data
            const total = history.n, pageTimeObj = {};
            let maxSec = 0;
            for (const i in history.p) {
                pageTimeObj[i] = history.p[i].getTotalSeconds();
                maxSec = Math.max(maxSec, pageTimeObj[i]);
            }
            const meanSec = history.getTotalSeconds() / history.getRead(),
                minSec = 30, pct = 100 / total;  // setting - minSec
            maxSec = meanSec + (maxSec - meanSec) / 2;  // 最大不透明度75%

            for (let i = 0; i < total; i++) {
                // pageSpan represent a page, color opacity represent the length of read time
                const pageSpan = createElement("span"),
                    alpha = (pageTimeObj[i] || 0) / (maxSec > minSec ? maxSec : minSec);
                // setting - background-color
                pageSpan.style = `
                    width: ${pct}%;
                    height: 100%;
                    background-color: rgba(90, 193, 189, ${alpha < 1 ? alpha : 1});
                    display: inline-block;
                `;
                progressNode.appendChild(pageSpan);
            }
        }

        if (!showReadingProgress)
            return;
        this.readingHistory = await setReadingData();
        // ZoteroPane.itemsView.collapseAllRows();  // 附件上不显示

        for (let i = 0; i < ZoteroPane.itemsView.rowCount; ++i) {
            const primaryCell = document.querySelector(`#item-tree-main-default-row-${i} .primary`);
            if (!primaryCell || primaryCell.querySelector(".zotero-style-progress"))
                continue;  // 这里如果文献很多，有滚动条的，primaryCell可能是null

            const item = Zotero.Items.getByLibraryAndKey(
                this.readingHistory.lib,
                ZoteroPane.itemsView.getRow(i).ref.key  // 第i行item的key
            );
            if (!item || !item.isRegularItem())
                continue;
            const pdf = await hasRead(item);  // 是否读过
            if (!pdf || !this.readingHistory.items[pdf.key])
                continue;
            renderProgress(primaryCell, this.readingHistory.items[pdf.key]);
        }
    };

    // 切换显示/隐藏阅读进度
    this.toggleProgressmeter = function () {
        showReadingProgress = !showReadingProgress;  // toggle flag
        $('#chartero-tool-menu-toggle-progress').attr(
            'label',
            showReadingProgress ? '隐藏高能进度条' : '显示高能进度条'
        );
        const tree = ZoteroPane.itemsView.tree._jsWindow.targetElement;
        if (showReadingProgress) {
            tree.addEventListener('scroll', refreshItemsProgress);
            refreshItemsProgress();
        }
        else {
            tree.removeEventListener('scroll', refreshItemsProgress);
            $('.zotero-style-progress').remove();
        }
    }

    // 数据可视化
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

    // 以后用来画组合图
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

    // 条目列表中所选条目改变
    this.onItemSelect = async function () {
        const items = ZoteroPane.getSelectedItems(),
            menu = document.getElementById('itemmenu-as-data'),
            is_a_note = items.length === 1 && items[0].isNote();

        menu.setAttribute('hidden', !is_a_note);
        menu.setAttribute('disabled', !is_a_note);
        refreshItemsProgress();

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

    // 给阅读器左侧边栏添加图片预览
    function addImagesPreviewer(reader) {
        reader._iframeWindow.wrappedJSObject.charteroProgressmeter = () => {
            const popMsg = new Zotero.ProgressWindow();
            popMsg.changeHeadline('', 'chrome://chartero/skin/icon.png', 'Chartero');
            popMsg.addDescription('‾‾‾‾‾‾‾‾‾‾‾‾');
            let prog = new popMsg.ItemProgress(
                'chrome://chartero/skin/accept.png',
                'Loading more images...'
            );
            popMsg.show();
            return function (percentage, page) {
                if (percentage >= 100) {
                    prog.setProgress(100);
                    prog.setText('Images loaded!');
                    popMsg.startCloseTimer(2333);
                } else {
                    prog.setProgress(percentage);
                    prog.setText('Scanning images in page ' + (page || 0));
                }
            };
        }
        const readoc = reader._iframeWindow.document;  // read-doc
        if (readoc.getElementById('viewImages'))
            return;  // 已经加过了
        const scr = readoc.createElement('script');
        scr.src = 'chrome://chartero/content/reader.js';
        readoc.head.appendChild(scr);
    }

    // 给阅读器右侧边栏添加仪表盘
    function addReaderDashboard(id) {
        const cont = document.getElementById(id + '-context'),
            box = cont.querySelector('tabbox');
        if (!box || box.querySelector('#chartero-real-time-dashboard-' + id))
            return;
        const tab = document.createElement('tab'),
            panel = document.createElement('tabpanel'),
            iframe = document.createElement('iframe');

        tab.setAttribute('label', '仪表盘');
        iframe.src = 'chrome://chartero/content/TabPanel/index.html';
        iframe.id = 'chartero-real-time-dashboard-' + id;
        iframe.setAttribute('flex', '1');

        panel.appendChild(iframe);
        box.tabs.append(tab);
        box.tabpanels.append(panel);
    }

    // 滚动阅读器缩略图
    function scrollThumbnailView() {
        const reader = getReader();
        // const viewer = 'PDFViewerApplication.pdfSidebar.pdfThumbnailViewer'
        // const scroll = '.scrollThumbnailIntoView(10)';    const reader = getReader();
        const layout = reader._iframeWindow.document.getElementById('thumbnailView');
        layout.getElementsByTagName('a')[reader.state.pageIndex].scrollIntoView();
    }

    this.notifierCallback = {
        notify: async function (event, type, ids, extraData) {
            if (type === 'tab' && event === 'select' && extraData[ids[0]].type == 'reader') {  // 选择标签页
                const reader = Zotero.Reader.getByTabID(ids[0]);
                await reader._initPromise;
                if (!reader)
                    return;
                addImagesPreviewer(reader);
                addReaderDashboard(ids[0]);

                const viewer = reader._iframeWindow.document.getElementById('viewer');
                // 防止重复添加
                viewer.removeEventListener('mouseup', scrollThumbnailView, false);
                viewer.addEventListener('mouseup', scrollThumbnailView, false);
            }
            // Zotero.log("////////////////////////////////////notify chartero");
            // Zotero.log(event);
            // Zotero.log(ids);
            // Zotero.log(type);
        },
    };

    this.cleanHistory = async function (history) {
        await setReadingData();
        const raw = noteItem.getNote();  // 清理笔记中xml标签
        const json = JSON.parse(raw.replace(/<\/?\w+>/g, ''));
        history.mergeJSON(json);

        let count = 0;
        for (k in history.items)
            if (!Zotero.Items.getByLibraryAndKey(history.lib, k)) {
                delete history.items[k];
                ++count;
            }
        noteItem.setNote(JSON.stringify(history));
        noteItem.saveTx();
        this.showMessage('清理了' + count + '条记录！', 'accept');
    }

    this.viewItemInLib = itemID => ZoteroPane.selectItem(itemID);

    this.viewDataTree = async function () {
        await setReadingData();
        noteItem && this.viewItemInLib(noteItem.id);
    }

    // 弹出对话框输入JSON合并到原有历史记录
    function messageHandler(event) {
        if (event.data === 'delete')
            Zotero.Chartero.cleanHistory(this.readingHistory);
        if (event.data !== 'import')
            return;

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
        scanInt = setInterval(this.scanSched, scanPeriod);

        savePeriod = Zotero.Prefs.get("chartero.savePeriod");
        if (!savePeriod) {
            savePeriod = 16000;
            Zotero.Prefs.set("chartero.savePeriod", savePeriod);
        }
        saveInt = setInterval(this.saveSched, savePeriod);
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
        // 从iframe传上来的
        window.addEventListener('message', messageHandler, false);

        // 防挂机用的 
        window.addEventListener('activate', () => {
            if (!scanInt && !saveInt) {
                scanInt = setInterval(this.scanSched, scanPeriod);
                saveInt = setInterval(this.saveSched, savePeriod);
            }
            state.active = true;
        }, true);
        window.addEventListener('deactivate', () => {
            clearInterval(scanInt);
            clearInterval(saveInt);
            scanInt = saveInt = null;
            state.active = false;
        }, true);

        // https://github.com/dcartertod/zotero-plugins
        Zotero.uiReadyPromise.then(() => {
            ZoteroPane.itemsView.onSelect.addListener(this.onItemSelect);
            ZoteroPane.collectionsView.onSelect.addListener(this.onCollectionSel);
        });
        const tabbox = document.getElementById("zotero-view-tabbox");
        tabbox.addEventListener("command", e => {
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

    // 打开overview页面
    this.newTab = async function () {
        await setReadingData();
        if (!noteItem) {
            Zotero.Chartero.showMessage('No history found!');
            return;
        }
        Zotero.showZoteroPaneProgressMeter('努力画图中……');
        let { id, container } = Zotero_Tabs.add({
            type: "library",
            title: "Chartero",
            data: {},
            select: true,
            onClose: undefined,
        });
        let f = document.createElement('iframe');
        f.id = 'overviewFrame';
        f.setAttribute('src', 'chrome://chartero/content/Overview/index.html');
        f.setAttribute('flex', 1);
        container.appendChild(f);
        return f;
    }

    // 设置笔记条目
    this.setHistoryData = function () {
        Zotero.Prefs.set("chartero.dataKey", ZoteroPane.getSelectedItems()[0].key);
        setReadingData();
    }

    this.buildRecentMenu = async function () {
        this.readingHistory = await setReadingData();
        console.debug(this.readingHistory);
        let items = new Array();
        for (const i in this.readingHistory.items)
            items.push({
                key: i,
                lastTime: this.readingHistory.items[i].lastTime()
            })
        items = items.sort((a, b) => a.lastTime < b.lastTime).map(i => i.key);

        let menu = document.getElementById('menupopup-open-recent');
        // Remove all nodes so we can regenerate
        while (menu.hasChildNodes())
            menu.removeChild(menu.firstChild);

        for (let i = 0; i < 10 && i < items.length; ++i) {
            const it = Zotero.Items.getByLibraryAndKey(this.readingHistory.lib, items[i]),
                parent = Zotero.Items.get(it.parentID || it.id),
                name = parent.getField('title'),
                style = `list-style-image: url('${parent.getImageSrc()}');`,
                menuitem = document.createElement('menuitem');
            menuitem.setAttribute('class', 'menuitem-iconic');
            menuitem.setAttribute('style', style);
            menuitem.setAttribute('label', name);
            menuitem.setAttribute('tooltiptext', name);
            menuitem.addEventListener('command', function () {
                ZoteroPane.viewAttachment(it.id);
            }, false);
            menu.appendChild(menuitem);
        }
    }

    // 保存字符串形式的svg
    this.saveSVG = function (str) {
        const fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(
            Components.interfaces.nsIFilePicker
        );
        fp.init(window, 'Chartero', Components.interfaces.nsIFilePicker.modeSave);
        fp.appendFilter('矢量图', '*.svg');
        fp.open(event => {
            if (event == Components.interfaces.nsIFilePicker.returnOK ||
                event == Components.interfaces.nsIFilePicker.returnReplace)
                Zotero.File.putContents(new FileUtils.File(fp.file.path + '.svg'), str);
        });
    }

    // 将字符串形式的svg复制为位图
    this.copyJpeg = function (str) {
        console.debug(window, this, str, document, URL);
    }

    this.dev = async function () {
        return await Zotero.Items.getAll(1, true);
    }
}
