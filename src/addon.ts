import ZoteroToolkit from "zotero-plugin-toolkit";
import AddonEvents from "./events";
import AddonPrefs from "./prefs";
import AddonViews from "./views";

class Addon {
  Zotero: _ZoteroConstructable;
  events: AddonEvents;
  views: AddonViews;
  prefs: AddonPrefs;
  locale: anyObj;
  toolkit: ZoteroToolkit;
  rootURI: string;  // root path to access the resources
  development: boolean;

  constructor() {
    // @ts-ignore
    this.rootURI = rootURI;
    const development = true, production = false;
    // @ts-ignore
    this.development = __env__;  // The env will be replaced after esbuild

    this.toolkit = new ZoteroToolkit();
    this.events = new AddonEvents(this);
    this.views = new AddonViews(this);
    this.prefs = new AddonPrefs(this);
  }
}

export default Addon;
