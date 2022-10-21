Zotero.Chartero = new function () {
    this.readingHistory = false;  // 统计数据
    var scanPeriod, savePeriod;  // 定时器时间间隔
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
    this.scanSched = function () {
        const reader = getReader();
        if (!state.active || !reader)
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

        if (!this.readingHistory)
            this.readingHistory = new HistoryLibrary(Zotero.Libraries.userLibraryID);

        const key = Zotero.Items.get(reader.itemID).key;
        let item = this.readingHistory.items[key];
        if (!item) {  // 新文件
            // 获取总页数
            const total = reader._iframeWindow.eval('PDFViewerApplication.pdfViewer.pagesCount');
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
    };

    // 右侧边栏的仪表盘
    function updateTabPanel(item) {
        $('#chartero-item-deck').attr('selectedIndex', 1);
        let f = document.getElementById('chartero-data-iframe');
        f.contentWindow.postMessage({
            history: this.readingHistory.items[item.key],  // 当前条目的浏览历史
            title: item.getField('title')
        }, '*');
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
        const items = ZoteroPane.getSelectedItems();
        const menu = document.getElementById('itemmenu-as-data');
        const is_a_note = items.length === 1 && items[0].isNote();

        menu.setAttribute('hidden', !is_a_note);
        menu.setAttribute('disabled', !is_a_note);

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
        const readoc = reader._iframeWindow.document;  // read-doc
        if (readoc.getElementById('viewImages'))
            return;  // 已经加过了
        const btn = readoc.createElement('button'),
            style = readoc.createElement('link'),
            view = readoc.createElement('div'),
            left = readoc.querySelector('#toolbarSidebarLeft #viewAnnotations'),  // TODO：right
            cont = readoc.getElementById('sidebarContent');

        style.setAttribute('rel', 'stylesheet');
        style.setAttribute('href', 'chrome://chartero/skin/reader.css');
        readoc.head.appendChild(style);

        view.id = 'imagesView';
        view.setAttribute('class', 'hidden');
        cont.appendChild(view);

        btn.id = 'viewImages';
        btn.setAttribute('class', 'toolbarButton');
        btn.setAttribute('title', 'All images');  // TODO：locale
        btn.setAttribute('tabindex', '-1');
        $(btn).html('<span>All images</span>');
        $(left).after(btn);

        const btns = readoc.getElementById('toolbarSidebarLeft').getElementsByTagName('button');
        for (const btn of btns)  // 给每个标签页按钮添加单击事件用于更新标签页选择状态
            $(btn).click(function () {
                if (this.id === 'viewImages') {
                    // 随便给个序号得了……
                    reader._iframeWindow.eval('PDFViewerApplication.pdfSidebar.active = 6;');
                    for (const b of btns)
                        b.classList.toggle('toggled', false);
                    for (const v of cont.children)
                        v.classList.toggle('hidden', true);
                    this.classList.toggle('toggled', true);
                    view.classList.toggle('hidden', false);
                } else {  // 其他标签页有内置的事件在工作，无需干涉
                    readoc.getElementById('viewImages').classList.toggle('toggled', false);
                    view.classList.toggle('hidden', true);
                }
            })
        const fileURL = Zotero.Items.get(reader.itemID).getLocalFileURL();  // PDF文件地址

        function renderImagesInPage(pdfPage) {
            pdfPage.getOperatorList().then(opList => {
                var svgGfx = new pdfjsLib.SVGGraphics(pdfPage.commonObjs, pdfPage.objs);
                return svgGfx.getSVG(opList, pdfPage.getViewport({ scale: 1 }));
            }).then(svg => {
                const urlArr = Array.prototype.map.call(
                    svg.getElementsByTagName('svg:image'),
                    i => i.getAttribute('xlink:href')
                );  // 获取所有图片的链接
                if (urlArr.length < 1)
                    return;
                for (const url of urlArr) {
                    const img = readoc.createElement('img'),
                        a = readoc.createElement('a'),
                        e = reader._iframeWindow.eval,
                        linkService = 'PDFViewerApplication.pdfThumbnailViewer.linkService';

                    img.setAttribute('src', url);
                    img.setAttribute('class', 'previewImg');
                    img.onclick = function () {  // 点击跳转
                        e(`${linkService}.goToPage(${pdfPage._pageIndex + 1})`);
                        return false;
                    };
                    view.appendChild(img);
                }
                const hr = readoc.createElement('hr');
                hr.setAttribute('class', 'hr-text');
                hr.setAttribute('data-content', pdfPage._pageIndex + 1);  // 页码分割线
                view.appendChild(hr);
            });
        }
        pdfjsLib.getDocument(fileURL).promise.then(doc => {
            for (let i = 0; i < doc.numPages; ++i)
                doc.getPage(i).then(renderImagesInPage);
        });
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
                const viewer = reader._iframeWindow.document.getElementById('viewer');
                // 防止重复添加
                viewer.removeEventListener('mouseup', scrollThumbnailView, false);
                viewer.addEventListener('mouseup', scrollThumbnailView, false);

                addImagesPreviewer(reader);
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
        // 从iframe传上来的
        window.addEventListener('message', messageHandler, false);

        // 防挂机用的 
        window.addEventListener('activate', () => {
            state.active = true;
        }, true);
        window.addEventListener('deactivate', () => {
            state.active = false;
        }, true);

        $("#zotero-items-splitter").mouseup(this.onResize);
        const tabbox = document.getElementById("zotero-view-tabbox");

        // https://github.com/dcartertod/zotero-plugins
        Zotero.uiReadyPromise.then(() => {
            ZoteroPane.itemsView.onSelect.addListener(this.onItemSelect);
            ZoteroPane.collectionsView.onSelect.addListener(this.onCollectionSel);
        });
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
        pdfjsLib.GlobalWorkerOptions.workerSrc =
            "resource://zotero/pdf-reader/pdf.worker.js";
    };

    // 刷新条目列表中的阅读进度标记
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

    // 打开overview页面
    this.newTab = async function () {
        if (!noteItem) {
            Zotero.Chartero.showMessage('No history found!');
            return;
        }
        Zotero.showZoteroPaneProgressMeter('努力画图中……', true);
        await setReadingData();  // TODO: 不好使
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
        await setReadingData();
        const raw = noteItem.getNote();
        const his = new HistoryLibrary(1);  // TODO: this.readingHistory
        his.mergeJSON(JSON.parse(raw));

        let items = new Array();
        for (const i in his.items)
            items.push({
                key: i,
                lastTime: his.items[i].lastTime()
            })
        items = items.sort((a, b) => a.lastTime < b.lastTime).map(i => i.key);

        let menu = document.getElementById('menupopup-open-recent');
        // Remove all nodes so we can regenerate
        while (menu.hasChildNodes())
            menu.removeChild(menu.firstChild);

        for (let i = 0; i < 10 && i < items.length; ++i) {
            const it = Zotero.Items.getByLibraryAndKey(his.lib, items[i]),
                parent = Zotero.Items.get(it.parentID || it.id),
                name = it.getField('title'),
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

    this.dev = function () {
        Zotero.Items.getAll(1, true).then(i => console.log(i))
    }
}
