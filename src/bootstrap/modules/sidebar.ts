const dashboards: { [id: number]: HTMLIFrameElement } = {};

export function updateDashboard(id?: number) {
    id &&
        addon.getPref('enableRealTimeDashboard') &&
        dashboards[id]?.contentWindow?.postMessage({ id }, '*');
}

/**
 * 初始化侧边栏TabPanel
 */
export function registerPanels() {
    // addon.readerTab.register(
    //     addon.locale.dashboard,
    //     (
    //         panel: XUL.TabPanel,
    //         ownerDeck: XUL.Deck,
    //         ownerWindow: Window,
    //         reader: _ZoteroTypes.ReaderInstance
    //     ) => renderDashboard(panel, reader)
    // );
    // addon.libTab.register(addon.locale.dashboard, (panel: XUL.TabPanel) =>
    //     renderDashboard(panel)
    // );
    // addon.reader.register('initialized', 'chartero', async reader => {
    //     await reader._waitForReader();
    //     await waitForReader(reader);
    //     if (addon.getPref('enableMinimap'))
    //         mountMinimap(reader);
    //     if (addon.getPref('enableAllImages'))
    //         addImagesPanelForReader(reader);
    // });
}

export function renderSummaryPanel(ids: number[]) {
    if (
        !ids.length ||
        ids.length > addon.getPref('maxSummaryItems')
    )
        return;
    const content = document.getElementById(
        'zotero-item-pane-content'
    ) as XUL.Deck,
        summary: any = addon.ui.createElement(document, 'iframe', {
            namespace: 'xul',
            id: 'chartero-summary-iframe',
            ignoreIfExists: true,
            attributes: {
                src: 'chrome://chartero/content/summary/index.html',
            },
            styles: { height: '100%' }
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
