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
    if (!Zotero.ItemPaneManager?.registerSection)
        addon.log(new Error('ItemPaneManager not found'));
    Zotero.ItemPaneManager?.registerSection({
        paneID: 'chartero-dashboard',
        pluginID: config.addonID,
        header: {
            l10nID: 'chartero-dashboardSection',
            icon: `resource://${config.addonName}/icons/sidebar.svg`,
        },
        sidenav: {
            l10nID: 'chartero-dashboardSection',
            icon: `resource://${config.addonName}/icons/sidebar.svg`,
        },
        sectionButtons: ['progress', 'page', 'date', 'group', 'relation', 'timeline'].map(tab => ({
            type: tab,
            icon: `resource://${config.addonName}/icons/${tab}.svg`,
            onClick(e) {
                const iframe = e.body.getElementsByTagName('iframe')[0];
                iframe.contentWindow!.postMessage({ tab }, '*');
            }
        })),
        onInit: args => {
            const iframe = addon.ui.appendElement({
                tag: 'iframe',
                namespace: 'xul',
                attributes: { src: 'chrome://chartero/content/dashboard/index.html' },
                styles: { height: '100%', width: '100%' },
                enableElementRecord: false,
            }, args.body) as HTMLIFrameElement;
            (iframe.contentWindow as any).wrappedJSObject.addon = addon;
            args.body.style.height = '600px';
        },
        onRender: args => {
        },
        onItemChange: args => {
            addon.log(args);
            const iframe = args.body.getElementsByTagName('iframe')[0],
                id = Number(args.item.id);
            iframe.contentWindow!.postMessage({ id }, '*');
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
