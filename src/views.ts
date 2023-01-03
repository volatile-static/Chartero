import Addon from "./addon";
import AddonModule from "./module";
import { addonRef } from "../package.json";

class AddonViews extends AddonModule {
  // You can store some element in the object attributes
  private progressWindowIcon: anyObj;

  constructor(parent: Addon) {
    super(parent);
    this.progressWindowIcon = {
      success: "chrome://zotero/skin/tick.png",
      fail: "chrome://zotero/skin/cross.png",
      default: `chrome://${addonRef}/content/icons/icon.png`,
    };
  }

  initViews() {
    // register style sheet
    const styles = this._Addon.toolkit.UI.createElement(document, 'link', 'html') as HTMLLinkElement;
    styles.type = 'text/css';
    styles.rel = 'stylesheet';
    styles.href = 'chrome://chartero/content/zoteroPane.css';
    document.documentElement.appendChild(styles);
    
  }

  unInitViews() {
    this._Addon.toolkit.Tool.log("Uninstalling Chartero...");
    this._Addon.toolkit.UI.removeAddonElements();
  }

  showProgressWindow(
    header: string,
    context: string,
    type: string = "default",
    t: number = 5000
  ) {
    // A simple wrapper of the Zotero ProgressWindow
    let progressWindow = new Zotero.ProgressWindow({ closeOnClick: true });
    progressWindow.changeHeadline(header);
    progressWindow.progress = new progressWindow.ItemProgress(
      this.progressWindowIcon[type],
      context
    );
    progressWindow.show();
    if (t > 0) {
      progressWindow.startCloseTimer(t);
    }
  }
}

export default AddonViews;
