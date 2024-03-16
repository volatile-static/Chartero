import { config } from "../../../package.json";

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
    Zotero.ItemPaneManager?.registerSections({
        paneID: 'chartero-dashboard',
        pluginID: config.addonID,
        head: {
            l10nID: 'zotero-toolbar-tabs-menu',
            icon: `chrome://zotero/skin/itempane/16/abstract.svg`,
        },
        sidenav: {
            l10nID: 'zotero-toolbar-tabs-menu',
            icon: `resource://${config.addonName}/icons/sidebar.svg`,
        },
        sectionButtons: [{
            type: 'info',
            icon: `resource://${config.addonName}/icons/sidebar.svg`,
            onClick: addon.log
        }],
        onInit: args => {
            const iframe = args.doc.createXULElement('iframe') as HTMLElement as HTMLIFrameElement;
            iframe.setAttribute('src', 'resource://chartero/dashboard/index.html');
            iframe.style.width = '100%';
            iframe.style.height = '100%';
            iframe.addEventListener('load', ({ target }) => {
                const win = (target as Document).defaultView!;
                (win as any).wrappedJSObject.addon = addon;
            }, true);
            args.body.appendChild(iframe);
            args.body.style.height = '600px';
        },
        onRender: args => {
            addon.log(args.getData());
        },
        onSecondaryRender: args => {
            addon.log(args.getData());
        },
        onDataChange: args => {
            addon.log(args.incomingData);
            if (args.incomingData.type === 'item') {
                const iframe = args.body.getElementsByTagName('iframe')[0];
                iframe.contentWindow!.postMessage({ id: args.incomingData.value.id }, '*');
            }
            return true;
        },
        onDestroy: args => addon.log(args),
    });
}

export function renderSummaryPanel(ids: number[]) {
    if (
        !ids.length ||
        ids.length > addon.getPref('maxSummaryItems')
    )
        return;
    const win = Zotero.getMainWindow(),
        content = win.document.getElementById(
            'zotero-item-pane-content'
        ) as XUL.Deck,
        summary: any = addon.ui.createElement(win.document, 'iframe', {
            namespace: 'xul',
            id: 'chartero-summary-iframe',
            ignoreIfExists: true,
            attributes: {
                src: 'chrome://chartero/content/summary/index.html',
            },
            styles: { height: '100%', width: '100%' }
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
