import { config } from "../../../package.json";
import { G } from "./global";

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
    function post(body: HTMLDivElement, message: object | string) {
        const iframe: HTMLIFrameElement = body.getElementsByTagName('iframe')[0];
        if (!iframe?.contentWindow)
            addon.log(new Error('Dashboard iframe not found'));
        else if (iframe.contentDocument?.readyState === 'complete')
            iframe.contentWindow.postMessage(message, '*');
        else
            iframe.addEventListener('load', ({ target }) =>
                (target as Document).defaultView!.postMessage(message, '*'), true);
        addon.log(message, iframe.contentDocument?.readyState);
    }
    const tabs = ['progress', 'page', 'date', 'group', /*'relation',*/ 'timeline'];

    Zotero.ItemPaneManager.registerSection({
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
        sectionButtons: tabs.map(tab => ({
            type: tab,
            l10nID: `chartero-dashboard-${tab}`,
            icon: `resource://${config.addonName}/icons/${tab}.svg`,
            onClick(args) {
                post(args.body, { tab });
                args.setSectionButtonStatus(tab, { disabled: true });
                args.setSectionButtonStatus(args.body.dataset.tab!, { disabled: false });
                args.body.dataset.tab = tab;
            }
        })),
        onInit: args => {
            const iframe = addon.ui.appendElement({
                tag: 'iframe',
                namespace: 'xul',
                attributes: { src: 'chrome://chartero/content/dashboard/index.html' },
                styles: { height: '100%', width: '100%' },
                enableElementRecord: false,
            }, args.body) as HTMLIFrameElement,
                ResizeObserver = G('ResizeObserver'),  // 切换页面时自动调整高度
                observer = new ResizeObserver(
                    ([entry]) => args.body.style.height = `${entry.contentRect.height}px`
                );
            (iframe.contentWindow as any).wrappedJSObject.addon = addon;
            iframe.addEventListener('load', ({ target }) => {
                observer.observe((target as Document).documentElement!);
            }, true);

            // 默认第一页
            args.setSectionButtonStatus('progress', { disabled: true });
            args.body.dataset.tab = 'progress';
        },
        onRender: () => { },
        onItemChange: args => {
            const hidden = args.item.libraryID == Zotero.Libraries.userLibraryID;
            args.setSectionButtonStatus('group', { hidden });
            if (hidden && args.body.dataset.tab == 'group') {
                args.setSectionButtonStatus('progress', { disabled: true });
                args.setSectionButtonStatus('group', { disabled: false });
                args.body.dataset.tab = 'progress';
                post(args.body, { tab: 'progress' });
            }
            post(args.body, { id: args.item.id });
        },
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
        ) as unknown as XULDeckElement,
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
