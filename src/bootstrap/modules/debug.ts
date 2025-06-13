import { config } from '../../../package.json';
import { ICON_URL } from './utils';

export function addDebugMenu() {
    const Zotero_Tabs = (Zotero.getMainWindow() as unknown as _ZoteroTypes.MainWindow).Zotero_Tabs;
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
    addon.menu.register('menuFile', {
        tag: 'menuitem',
        label: 'reload',
        icon: ICON_URL,
        commandListener: async () => {
            Services.obs.notifyObservers({}, 'startupcache-invalidate');
            const { AddonManager } = ChromeUtils.import('resource://gre/modules/AddonManager.jsm');
            const addon = await AddonManager.getAddonByID(config.addonID);
            addon.reload();
        },
    });
    addon.menu.register('menuFile', {
        tag: 'menuitem',
        label: 'restart',
        icon: ICON_URL,
        commandListener: () => Zotero.Utilities.Internal.quit(true),
    });
}
