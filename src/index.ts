import Addon from "./addon";

/**
 * Globals: bootstrap.js > ctx
 * const ctx = {
    Zotero,
    rootURI,
    window,
    document: window.document,
    ZoteroPane: Zotero.getActiveZoteroPane(),
  };
 */
if (!Zotero.Chartero) {
  Zotero.Chartero = new Addon();
  // @ts-ignore
  Zotero.Chartero.events.onInit();
}
