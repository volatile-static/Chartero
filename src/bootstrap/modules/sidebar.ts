import addImagesPanelForReader from './images';
import renderMinimap from './minimap';

const dashboards: { [id: number]: HTMLIFrameElement } = {};

export function updateDashboard(id?: number) {
    id &&
        addon.getPref('enableRealTimeDashboard') &&
        dashboards[id]?.contentWindow?.postMessage({ id }, '*');
}

async function renderDashboard(
    panel: XUL.TabPanel,
    reader?: _ZoteroTypes.ReaderInstance
) {
    await reader?._waitForReader();
    if (panel.childElementCount) return; // 已经有元素了
    const dashboard = addon.ui.appendElement(
        {
            tag: 'iframe',
            namespace: 'xul',
            ignoreIfExists: true,
            attributes: {
                flex: 1,
                src: 'chrome://chartero/content/dashboard/index.html',
            },
            classList: ['chartero-dashboard'],
        },
        panel
    ) as HTMLIFrameElement;
    (dashboard.contentWindow as any).wrappedJSObject.addon ??= addon;

    if (reader) {
        dashboard.contentWindow?.addEventListener('load', () =>
            updateDashboard(reader.itemID)
        );
        reader.itemID && (dashboards[reader.itemID] = dashboard);
    }
}

/**
 * 初始化侧边栏TabPanel
 */
export function registerPanels() {
    addon.readerTab.register(
        addon.locale.dashboard,
        (
            panel: XUL.TabPanel,
            ownerDeck: XUL.Deck,
            ownerWindow: Window,
            reader: _ZoteroTypes.ReaderInstance
        ) => renderDashboard(panel, reader)
    );
    addon.libTab.register(addon.locale.dashboard, (panel: XUL.TabPanel) =>
        renderDashboard(panel)
    );
    addon.reader.register('initialized', 'chartero', async reader => {
        await reader._waitForReader();
        // renderMinimap(reader);
        // addImagesPreviewer(reader);
        if (reader.type == 'pdf')
            addImagesPanelForReader(reader);
    });
}

export function renderSummaryPanel(ids: number[]) {
    const content = document.getElementById(
        'zotero-item-pane-content'
    ) as XUL.Deck,
        summary: any = addon.ui.createElement(document, 'iframe', {
            namespace: 'xul',
            id: 'chartero-summary-iframe',
            ignoreIfExists: true,
            attributes: {
                flex: 1,
                src: 'chrome://chartero/content/summary/index.html',
            },
        });

    if (summary.parentElement != content) {
        content.appendChild(summary);
        summary.contentWindow.wrappedJSObject.addon = addon;
        summary.contentWindow.addEventListener('load', () =>
            summary.contentWindow.postMessage(ids)
        );
    } else summary.contentWindow.postMessage(ids);
    content.selectedPanel = summary;
}

/**
 * 给阅读器左侧边栏添加图片预览
 */
function addImagesPreviewer(reader: _ZoteroTypes.ReaderInstance) {
    const win: any = reader._iframeWindow;
    if (!win || 'charteroProgressmeter' in win.wrappedJSObject) return;
    win.wrappedJSObject.charteroProgressmeter = () => {
        const popMsg = new Zotero.ProgressWindow(),
            locale = addon.locale.imagesLoaded;
        popMsg.changeHeadline(
            '',
            'chrome://chartero/content/icons/icon.png',
            'Chartero'
        );
        popMsg.addDescription('‾‾‾‾‾‾‾‾‾‾‾‾');
        let prog = new popMsg.ItemProgress(
            'chrome://chartero/content/icons/accept.png',
            addon.locale.loadingImages
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
    addon.ui.appendElement(
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
