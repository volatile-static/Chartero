import * as toolBase from "zotero-plugin-toolkit/dist/basic";
import { MenuManager } from "zotero-plugin-toolkit/dist/managers/menu";
import { PreferencePaneManager } from "zotero-plugin-toolkit/dist/managers/preferencePane";
import { ItemTreeManager } from "zotero-plugin-toolkit/dist/managers/itemTree";
import { LibraryTabPanelManager } from "zotero-plugin-toolkit/dist/managers/libraryTabPanel";
import { ReaderTabPanelManager } from "zotero-plugin-toolkit/dist/managers/readerTabPanel";
import { ReaderTool } from "zotero-plugin-toolkit/dist/tools/reader";
import { UITool } from "zotero-plugin-toolkit/dist/tools/ui";
import { config } from "../../package.json";
import { onInit } from "./events";
import prefsPaneDoc from "./modules/prefs";

export class CharteroToolkit extends toolBase.BasicTool {
  readonly menu: MenuManager;
  // readonly column: ItemTreeManager;
  readonly libTab: LibraryTabPanelManager;
  readonly prefPane: PreferencePaneManager;
  readonly readerTab: ReaderTabPanelManager;
  readonly reader: ReaderTool;
  readonly ui: UITool;
  readonly locale: typeof import('../../addon/chrome/locale/zh-CN/chartero.json');

  constructor() {
    super();
    if (!__dev__) {
      this.basicOptions.log.prefix = `[${config.addonName}]`;
      this.basicOptions.log.disableConsole = true;
    }
    this.menu = new MenuManager(this);
    this.prefPane = new PreferencePaneManager(this);
    // this.column = new ItemTreeManager(this);
    this.libTab = new LibraryTabPanelManager(this);
    this.readerTab = new ReaderTabPanelManager(this);
    this.reader = new ReaderTool(this);
    this.ui = new UITool(this);
    this.locale = JSON.parse(
      Zotero.File.getContentsFromURL('chrome://chartero/locale/chartero.json')
    );
  }
}

export class Addon {
  overviewTabID?: string;
  constructor() {
    onInit();
  }

  unload() {
    this.overviewTabID && Zotero_Tabs.close(this.overviewTabID);
    toolBase.unregister(toolkit);
    delete Zotero.Chartero;
  }

  loadPreferencesPane(win: Window) {
    toolkit.ui.appendElement(
      prefsPaneDoc(),
      win.document.getElementById('zotero-prefpane-' + config.addonName)!
    );
    toolkit.log('Preferences Pane loaded!');
  }
}
