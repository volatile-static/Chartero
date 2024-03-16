import { config } from '../../../package.json';
import { ICON_URL } from './utils';

export function addDebugMenu() {
    const Zotero_Tabs = (Zotero.getMainWindow() as unknown as MainWindow).Zotero_Tabs;
    addon.menu.register('item', { tag: 'menuseparator' });
    addon.menu.register('item', {
        tag: 'menuitem',
        label: 'log to console',
        icon: ICON_URL,
        commandListener: () => addon.log(Zotero.getActiveZoteroPane().getSelectedItems()),
    });

    addon.menu.register('collection', { tag: 'menuseparator' });
    addon.menu.register('collection', {
        tag: 'menuitem',
        label: 'log to console',
        icon: ICON_URL,
        commandListener: () => addon.log(Zotero.getActiveZoteroPane().getCollectionTreeRow()?.ref),
    });

    addon.menu.register('menuHelp', { tag: 'menuseparator' });
    addon.menu.register('menuHelp', {
        tag: 'menuitem',
        label: 'log reader to console',
        icon: ICON_URL,
        commandListener: () => addon.log(Zotero.Reader.getByTabID(Zotero_Tabs.selectedID)),
    });
    addon.menu.register('menuHelp', {
        tag: 'menuitem',
        label: 'log iframe window to console',
        icon: ICON_URL,
        commandListener: () => addon.log((
            <_ZoteroTypes.Reader.PDFView>Zotero.Reader.getByTabID(Zotero_Tabs.selectedID)._primaryView
        )._iframeWindow)
    });
    addon.menu.register('menuHelp', {
        tag: 'menuitem',
        label: 'log main items to console',
        icon: ICON_URL,
        commandListener: () => addon.log((<any>addon.history)._mainItems),
    });
    addon.menu.register('menuHelp', {
        tag: 'menuitem',
        label: 'open dev tools',
        icon: ICON_URL,
        commandListener: () => {
            Zotero.Prefs.set('devtools.debugger.remote-enabled', true, true);
            Zotero.Prefs.set('devtools.debugger.remote-port', 6100, true);
            Zotero.Prefs.set('devtools.debugger.prompt-connection', false, true);
            Zotero.Prefs.set('devtools.debugger.chrome-debugging-websocket', false, true);

            const env =
                // @ts-expect-error Cc Ci
                // eslint-disable-next-line mozilla/use-services
                Services.env || Cc['@mozilla.org/process/environment;1'].getService(Ci.nsIEnvironment);

            env.set('MOZ_BROWSER_TOOLBOX_PORT', 6100);
            Zotero.openInViewer('chrome://devtools/content/framework/browser-toolbox/window.html', {
                onLoad: doc => {
                    doc.getElementById('status-message-container')!.style.visibility = 'collapse';
                    let toolboxBody: HTMLElement;
                    waitUntil(
                        () => {
                            toolboxBody = (
                                doc.querySelector(
                                    '.devtools-toolbox-browsertoolbox-iframe',
                                ) as HTMLIFrameElement
                            ).contentDocument!.querySelector('.theme-body')!;
                            return toolboxBody;
                        },
                        () => (toolboxBody.style.pointerEvents = 'all'),
                    );
                },
            });

            function waitUntil(
                condition: () => unknown,
                callback: () => void,
                interval = 100,
                timeout = 10000,
            ) {
                const start = Date.now();
                const intervalId = setInterval(() => {
                    if (condition()) {
                        clearInterval(intervalId);
                        callback();
                    } else if (Date.now() - start > timeout) {
                        clearInterval(intervalId);
                    }
                }, interval);
            }
        },
    });
    addon.menu.register('menuFile', {
        tag: 'menuitem',
        label: 'reload',
        icon: ICON_URL,
        commandListener: async () => {
            Services.obs.notifyObservers(null, 'startupcache-invalidate');
            const { AddonManager } = ChromeUtils.import('resource://gre/modules/AddonManager.jsm');
            const addon = await AddonManager.getAddonByID(config.addonID);
            addon.reload();
        },
    });
}
