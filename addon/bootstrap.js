var chromeHandle;

async function startup({ id, version, resourceURI, rootURI }, reason) {
  await Zotero.initializationPromise;
  Zotero.debug('~~~~~~ __addonName__ startup ~~~~~~');

  var aomStartup = Components.classes[
    "@mozilla.org/addons/addon-manager-startup;1"
  ].getService(Components.interfaces.amIAddonManagerStartup);
  var manifestURI = Services.io.newURI(rootURI + "manifest.json");
  chromeHandle = aomStartup.registerChrome(manifestURI, [
    ["locale", "__addonName__", "en-US", rootURI + "locale/en-US/"],
    ["locale", "__addonName__", "zh-CN", rootURI + "locale/zh-CN/"],
    ["locale", "__addonName__", "ja-JP", rootURI + "locale/ja-JP/"],
    ["locale", "__addonName__", "it-IT", rootURI + "locale/it-IT/"],
    ["content", "__addonName__", rootURI + "content/"],
  ]);

  const resProto = Cc[
    "@mozilla.org/network/protocol;1?name=resource"
  ].getService(Ci.nsISubstitutingProtocolHandler),
    uri = Services.io.newURI(rootURI + 'content/');
  Zotero.debug(uri);
  resProto.setSubstitutionWithFlags(
    "__addonName__",
    uri,
    resProto.ALLOW_CONTENT_ACCESS
  );

  const window = Zotero.getMainWindow();
  // Global variables for plugin code
  const ctx = {
    Zotero,
    rootURI,
    window,
    document: window.document,
    ZoteroPane: Zotero.getActiveZoteroPane(),
    Zotero_Tabs: window.Zotero_Tabs
  };
  try {
    Services.scriptloader.loadSubScript(
      rootURI + 'content/__addonName__.js',
      ctx
    );
  } catch (error) {
    window.console.debug(error);
  }
  addon.init();
}

async function onMainWindowLoad({ window }, reason) {
  addon.log(reason)
  // addon.init();
}

async function onMainWindowUnload({ window }, reason) {
  addon.log(reason)
  // addon.unload();
}

function shutdown({ id, version, resourceURI, rootURI }, reason) {
  if (reason === APP_SHUTDOWN)
    return;
  addon.unload();

  Cc["@mozilla.org/intl/stringbundle;1"]
    .getService(Components.interfaces.nsIStringBundleService)
    .flushBundles();

  Cu.unload(rootURI + 'content/__addonName__.js');

  if (chromeHandle) {
    chromeHandle.destruct();
    chromeHandle = null;
  }
}
