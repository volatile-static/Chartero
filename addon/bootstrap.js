/* Copyright 2012 Will Shanks.
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

if (typeof Zotero == "undefined") {
  var Zotero;
}

var chromeHandle;

// In Zotero 6, bootstrap methods are called before Zotero is initialized, and using include.js
// to get the Zotero XPCOM service would risk breaking Zotero startup. Instead, wait for the main
// Zotero window to open and get the Zotero object from there.
//
// In Zotero 7, bootstrap methods are not called until Zotero is initialized, and the 'Zotero' is
// automatically made available.
async function waitForZotero() {
  if (typeof Zotero != "undefined") {
    await Zotero.initializationPromise;
  }

  var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
  var windows = Services.wm.getEnumerator("navigator:browser");
  var found = false;
  while (windows.hasMoreElements()) {
    let win = windows.getNext();
    if (win.Zotero) {
      Zotero = win.Zotero;
      found = true;
      break;
    }
  }
  if (!found) {
    await new Promise((resolve) => {
      var listener = {
        onOpenWindow: function (aWindow) {
          // Wait for the window to finish loading
          let domWindow = aWindow
            .QueryInterface(Ci.nsIInterfaceRequestor)
            .getInterface(Ci.nsIDOMWindowInternal || Ci.nsIDOMWindow);
          domWindow.addEventListener(
            "load",
            function () {
              domWindow.removeEventListener("load", arguments.callee, false);
              if (domWindow.Zotero) {
                Services.wm.removeListener(listener);
                Zotero = domWindow.Zotero;
                resolve();
              }
            },
            false
          );
        },
      };
      Services.wm.addListener(listener);
    });
  }
  await Zotero.initializationPromise;
}

async function startup({ id, version, resourceURI, rootURI }, reason) {
  await waitForZotero();

  if (Zotero.platformMajorVersion >= 102) {
    var aomStartup = Components.classes[
      "@mozilla.org/addons/addon-manager-startup;1"
    ].getService(Components.interfaces.amIAddonManagerStartup);
    var manifestURI = Services.io.newURI(rootURI + "manifest.json");
    chromeHandle = aomStartup.registerChrome(manifestURI, [
      ["locale", "__addonRef__", "en-US", rootURI + "chrome/locale/en-US/"],
      ["locale", "__addonRef__", "zh-CN", rootURI + "chrome/locale/zh-CN/"],
      ["content", "__addonRef__", rootURI + "chrome/content/"]
    ]);
  }

  // String 'rootURI' introduced in Zotero 7
  if (!rootURI) {
    rootURI = resourceURI.spec;
  }

  const window = Zotero.getMainWindow(),
    fr = window.document.createElement('iframe');
  fr.style.display = 'none';
  window.document.documentElement.appendChild(fr);

  // const ctx = { document: Zotero.Utilities.Internal.getDOMDocument() };
  Zotero.Utilities.Internal.assignProps(fr.contentWindow, window, [
    'Zotero',
    'Zotero_Tabs',
    'ZoteroPane',
    'ZoteroItemPane',
    'ZoteroContextPane',
    'Zotero_File_Interface',
    // 'setTimeout',
    // 'clearTimeout',
    // 'setInterval',
    // 'clearInterval',
    // 'requestAnimationFrame',
    'React',
    'ReactDOM',
    'window',
    // 'fetch',
    // 'navigator',
    // 'screen',
    // 'console',
    'require',
  ]);
  window.console.debug('~~~~~~ Chartero startup ~~~~~~');
  try {
    Services.scriptloader.loadSubScript(
      `${rootURI}/chrome/content/scripts/Chartero.js`,
      fr.contentWindow
    );
  } catch (error) {
    window.console.debug(error.message, error.location);
  }
}

function shutdown({ id, version, resourceURI, rootURI }, reason) {
  if (reason === APP_SHUTDOWN) {
    return;
  }
  if (typeof Zotero === "undefined") {
    Zotero = Components.classes["@zotero.org/Zotero;1"].getService(
      Components.interfaces.nsISupports
    ).wrappedJSObject;
  }
  Zotero.Chartero && Zotero.Chartero.unload();

  Cc["@mozilla.org/intl/stringbundle;1"]
    .getService(Components.interfaces.nsIStringBundleService)
    .flushBundles();

  Cu.unload(`${rootURI}/chrome/content/scripts/Chartero.js`);

  if (chromeHandle) {
    chromeHandle.destruct();
    chromeHandle = null;
  }
}

function install(data) { }
function uninstall() { }
