import * as toolBase from "zotero-plugin-toolkit/dist/basic";
import HistoryManager from "zotero-reading-history";
import { MenuManager } from "zotero-plugin-toolkit/dist/managers/menu";
import { PreferencePaneManager } from "zotero-plugin-toolkit/dist/managers/preferencePane";
import { ItemTreeManager } from "zotero-plugin-toolkit/dist/managers/itemTree";
import { LibraryTabPanelManager } from "zotero-plugin-toolkit/dist/managers/libraryTabPanel";
import { ReaderTabPanelManager } from "zotero-plugin-toolkit/dist/managers/readerTabPanel";
import { ReaderTool } from "zotero-plugin-toolkit/dist/tools/reader";
import { UITool } from "zotero-plugin-toolkit/dist/tools/ui";
import { addonName } from "../package.json";
import { onInit } from "./events";

export class CharteroToolkit extends toolBase.BasicTool {
  readonly menu: MenuManager;
  readonly column: ItemTreeManager;
  readonly history: HistoryManager;
  readonly libTab: LibraryTabPanelManager;
  readonly prefPane: PreferencePaneManager;
  readonly readerTab: ReaderTabPanelManager;
  readonly reader: ReaderTool;
  readonly ui: UITool;

  constructor() {
    super();
    if (!__dev__) {
      this.basicOptions.log.prefix = `[${addonName}]`;
      this.basicOptions.log.disableConsole = true;
    }
    this.menu = new MenuManager(this);
    this.prefPane = new PreferencePaneManager(this);
    this.column = new ItemTreeManager(this);
    this.libTab = new LibraryTabPanelManager(this);
    this.readerTab = new ReaderTabPanelManager(this);
    this.history = new HistoryManager(this, { numPages: true });
    this.reader = new ReaderTool(this);
    this.ui = new UITool(this);
  }
}

export class Addon {
  constructor() {
    onInit();
  }

  unload() {
    toolkit.history.disable();
    toolBase.unregister(toolkit);
    delete Zotero.Chartero;
  }

  loadPreferencesPane(win: Window) {
    // renderPrefsPane(win.document.getElementById('zotero-prefpane-Chartero') as HTMLDivElement);
    toolkit.log('Preferences Pane loaded!');
  }
}
