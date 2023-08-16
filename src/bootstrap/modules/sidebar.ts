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
