import { config } from '../../../package.json';

export function addDebugMenu() {
    addon.menu.register('item', { tag: 'menuseparator' });
    addon.menu.register('item', {
        tag: 'menuitem',
        label: 'log to console',
        icon: `chrome://${config.addonName}/content/icons/icon@16px.png`,
        commandListener: () => addon.log(ZoteroPane.getSelectedItems())
    });

    addon.menu.register('collection', { tag: 'menuseparator' });
    addon.menu.register('collection', {
        tag: 'menuitem',
        label: 'log to console',
        icon: `chrome://${config.addonName}/content/icons/icon@16px.png`,
        commandListener: () => addon.log(ZoteroPane.getCollectionTreeRow()?.ref)
    });

    addon.menu.register('menuHelp', { tag: 'menuseparator' });
    addon.menu.register('menuHelp', {
        tag: 'menuitem',
        label: 'log reader to console',
        icon: `chrome://${config.addonName}/content/icons/icon@16px.png`,
        commandListener: () => addon.log(Zotero.Reader.getByTabID(Zotero_Tabs.selectedID))
    });
}
