import { config } from '../../../package.json';

export function addDebugMenu() {
    addon.menu.register('item', { tag: 'menuseparator' });
    addon.menu.register('item', {
        tag: 'menuitem',
        label: 'log to console',
        icon: `chrome://${config.addonName}/content/icons/icon32.png`,
        commandListener: () => addon.log(ZoteroPane.getSelectedItems())
    });

    addon.menu.register('collection', { tag: 'menuseparator' });
    addon.menu.register('collection', {
        tag: 'menuitem',
        label: 'log to console',
        icon: `chrome://${config.addonName}/content/icons/icon32.png`,
        commandListener: () => addon.log(ZoteroPane.getCollectionTreeRow()?.ref)
    });

    addon.menu.register('menuHelp', { tag: 'menuseparator' });
    addon.menu.register('menuHelp', {
        tag: 'menuitem',
        label: 'log reader to console',
        icon: `chrome://${config.addonName}/content/icons/icon32.png`,
        commandListener: () => addon.log(Zotero.Reader.getByTabID(Zotero_Tabs.selectedID))
    });
    addon.menu.register('menuHelp', {
        tag: 'menuitem',
        label: 'log main items to console',
        icon: `chrome://${config.addonName}/content/icons/icon32.png`,
        commandListener: () => addon.log((<any>addon.history)._mainItems)
    });
    addon.menu.register('menuHelp', {
        tag: 'menuitem',
        label: 'open dev tools',
        icon: `chrome://${config.addonName}/content/icons/icon32.png`,
        commandListener: () => {
            const env =
                Services.env ||
                Cc["@mozilla.org/process/environment;1"].getService(Ci.nsIEnvironment);

            env.set("MOZ_BROWSER_TOOLBOX_PORT", 6100);
            Zotero.openInViewer(
                "chrome://devtools/content/framework/browser-toolbox/window.html",
                {
                    onLoad: (doc: Document) => {
                        doc.getElementById("status-message-container")!.style.visibility = "collapse";
                        let toolboxBody: HTMLElement;
                        waitUntil(
                            () => {
                                toolboxBody = doc
                                    .querySelector(".devtools-toolbox-browsertoolbox-iframe")
                                    ?.contentDocument?.querySelector(".theme-body");
                                return toolboxBody;
                            },
                            () => {
                                toolboxBody.style = "pointer-events: all !important";
                            }
                        );
                    },
                }
            );

            function waitUntil(condition: () => unknown, callback: Function, interval = 100, timeout = 10000) {
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
        }
    });
}
