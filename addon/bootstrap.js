/* eslint-disable @typescript-eslint/no-unused-vars */
var chromeHandle;

async function startup({ id, version, resourceURI, rootURI }, reason) {
    Zotero.debug('~~~~~~ __addonName__ startup ~~~~~~');

    var aomStartup = Cc['@mozilla.org/addons/addon-manager-startup;1'].getService(Ci.amIAddonManagerStartup);
    var manifestURI = Services.io.newURI(rootURI + 'manifest.json');
    chromeHandle = aomStartup.registerChrome(manifestURI, [
        ['locale', '__addonName__', 'en-US', rootURI + 'locale/en-US/'],
        ['locale', '__addonName__', 'zh-CN', rootURI + 'locale/zh-CN/'],
        ['locale', '__addonName__', 'ja-JP', rootURI + 'locale/ja-JP/'],
        ['locale', '__addonName__', 'it-IT', rootURI + 'locale/it-IT/'],
        ['content', '__addonName__', rootURI + 'content/'],
    ]);

    const resProto = Cc['@mozilla.org/network/protocol;1?name=resource'].getService(
            Ci.nsISubstitutingProtocolHandler,
        ),
        uri = Services.io.newURI(rootURI + 'content/');
    Zotero.debug(uri);
    resProto.setSubstitutionWithFlags('__addonName__', uri, resProto.ALLOW_CONTENT_ACCESS);

    const window = Zotero.getMainWindow();
    // Global variables for plugin code
    const ctx = {
        rootURI,
        // window,
        // document: window.document,
        // ZoteroPane: Zotero.getActiveZoteroPane(),
        // Zotero_Tabs: window.Zotero_Tabs,
    };
    try {
        Services.scriptloader.loadSubScript(rootURI + 'content/__addonName__.js', ctx);
    } catch (error) {
        window.console.debug(error);
    }
    addon.init();
}

async function onMainWindowLoad({ window }, reason) {
    addon.init(window);
}

async function onMainWindowUnload({ window }, reason) {
    window.document.querySelector('[href="chartero-prefs.ftl"]')?.remove();
}

async function shutdown({ id, version, resourceURI, rootURI }, reason) {
    addon.log(reason);
    if (reason === APP_SHUTDOWN) return;
    await addon.unload();

    if (chromeHandle) {
        chromeHandle.destruct();
        chromeHandle = null;
    }
}
