import { config } from '../../../package.json';
import { ICON_URL } from './utils';
import { plainMenuItem, registerMenu } from './menu';

export function addDebugMenu() {
    const Zotero_Tabs = () => (Zotero.getMainWindow() as unknown as _ZoteroTypes.MainWindow).Zotero_Tabs;

    // 条目与分类的右键菜单会被Zotero自动分组并加上分隔符，因此顶层不允许出现分隔符
    registerMenu('debug-item', 'main/library/item', [
        plainMenuItem('log to console', () => addon.log(Zotero.getActiveZoteroPane()?.getSelectedItems()), ICON_URL),
    ]);
    registerMenu('debug-collection', 'main/library/collection', [
        plainMenuItem(
            'log to console',
            () => addon.log(Zotero.getActiveZoteroPane()?.getCollectionTreeRow()?.ref),
            ICON_URL,
        ),
    ]);

    registerMenu('debug-help', 'main/menubar/help', [
        { menuType: 'separator' },
        plainMenuItem(
            'log reader to console',
            () => addon.log(Zotero.Reader.getByTabID(Zotero_Tabs().selectedID)),
            ICON_URL,
        ),
        plainMenuItem(
            'log iframe window to console',
            () => addon.log((
                <_ZoteroTypes.Reader.PDFView>Zotero.Reader.getByTabID(Zotero_Tabs().selectedID)?._primaryView
            )?._iframeWindow),
            ICON_URL,
        ),
        plainMenuItem('log main items to console', () => addon.log((<any>addon.history)._mainItems), ICON_URL),
    ]);

    registerMenu('debug-file', 'main/menubar/file', [
        plainMenuItem(
            'reload',
            async () => {
                Services.obs.notifyObservers({}, 'startupcache-invalidate');
                const { AddonManager } = ChromeUtils.importESModule('resource://gre/modules/AddonManager.sys.mjs');
                const addon = await AddonManager.getAddonByID(config.addonID);
                addon.reload();
            },
            ICON_URL,
        ),
        plainMenuItem('restart', () => Zotero.Utilities.Internal.quit(true), ICON_URL),
    ]);
}
