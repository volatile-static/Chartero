function renderDashboard(panel: XUL.TabPanel) {
    if (panel.childElementCount)
        // 已经有元素了
        return;
    const dashboard = toolkit.ui.appendElement(
        {
            tag: 'iframe',
            namespace: 'xul',
            skipIfExists: true,
            attributes: {
                flex: 1,
                src: 'chrome://chartero/content/dashboard/index.html',
            },
        },
        panel
    ) as HTMLIFrameElement;
    (dashboard.contentWindow as any).toolkit = toolkit;
}

/**
 * 初始化侧边栏TabPanel
 */
export default function registerPanels() {
    toolkit.readerTab.register(
        toolkit.locale.dashboard,
        (panel?: XUL.TabPanel) => panel && renderDashboard(panel)
    );
    toolkit.libTab.register(toolkit.locale.dashboard, (panel: XUL.TabPanel) =>
        renderDashboard(panel)
    );
    toolkit.reader.register('initialized', 'chartero', reader =>
        reader._waitForReader().then(() => addImagesPreviewer(reader))
    );
}

/**
 * 给阅读器左侧边栏添加图片预览
 */
function addImagesPreviewer(reader: _ZoteroTypes.ReaderInstance) {
    const win: any = reader._iframeWindow;
    if (!win || 'charteroProgressmeter' in win.wrappedJSObject) return;
    win.wrappedJSObject.charteroProgressmeter = () => {
        const popMsg = new Zotero.ProgressWindow(),
            locale = toolkit.locale.imagesLoaded;
        popMsg.changeHeadline(
            '',
            'chrome://chartero/content/icons/icon.png',
            'Chartero'
        );
        popMsg.addDescription('‾‾‾‾‾‾‾‾‾‾‾‾');
        let prog = new popMsg.ItemProgress(
            'chrome://chartero/content/icons/accept.png',
            toolkit.locale.loadingImages
        );
        popMsg.show();
        return function (percentage: number, page: number) {
            if (percentage >= 100) {
                prog.setProgress(100);
                prog.setText(locale);
                popMsg.startCloseTimer(2333, true);
            } else {
                prog.setProgress(percentage);
                prog.setText('Scanning images in page ' + (page || 0));
            }
        };
    };
    toolkit.ui.appendElement(
        {
            tag: 'script',
            namespace: 'html',
            skipIfExists: true,
            properties: {
                innerHTML: Zotero.File.getContentsFromURL(
                    'chrome://chartero/content/reader.js'
                ),
            },
        },
        win.document.head
    );
}
