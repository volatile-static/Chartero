import * as toolBase from 'zotero-plugin-toolkit/dist/basic';
import { MenuManager } from 'zotero-plugin-toolkit/dist/managers/menu';
import { PreferencePaneManager } from 'zotero-plugin-toolkit/dist/managers/preferencePane';
import { ReaderInstanceManager } from 'zotero-plugin-toolkit/dist/managers/readerInstance';
import { LibraryTabPanelManager } from 'zotero-plugin-toolkit/dist/managers/libraryTabPanel';
import { ReaderTabPanelManager } from 'zotero-plugin-toolkit/dist/managers/readerTabPanel';
import { UITool } from 'zotero-plugin-toolkit/dist/tools/ui';
import { config } from '../../package.json';
import { onInit } from './events';
import { updateDashboard } from './modules/sidebar';
import ReadingHistory from './modules/history/history';
import prefsPaneDoc from './modules/prefs';

export class CharteroToolkit extends toolBase.BasicTool {
    readonly menu: MenuManager;
    // readonly column: ItemTreeManager;
    readonly libTab: LibraryTabPanelManager;
    readonly prefPane: PreferencePaneManager;
    readonly readerTab: ReaderTabPanelManager;
    readonly reader: ReaderInstanceManager;
    readonly ui: UITool;
    readonly history: ReadingHistory;
    readonly locale: typeof import('../../addon/locale/zh-CN/chartero.json');

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
        this.reader = new ReaderInstanceManager(this);
        this.ui = new UITool(this);
        this.history = new ReadingHistory();
        this.locale = JSON.parse(
            Zotero.File.getContentsFromURL(
                'chrome://chartero/locale/chartero.json'
            )
        );
    }

    getPref(key: string) {
        return Zotero.Prefs.get(`${config.addonName}.${key}`);
    }
}

export class Addon {
    overviewTabID?: string;
    constructor() {
        onInit();
    }

    unload() {
        // toolkit.history.disable();
        this.overviewTabID && Zotero_Tabs.close(this.overviewTabID);
        toolBase.unregister(toolkit);
        delete Zotero.Chartero;
    }

    loadPreferencesPane(win: Window) {
        toolkit.ui.insertElementBefore(
            prefsPaneDoc(),
            win.document.getElementById('zotero-prefpane-' + config.addonName)!
                .lastElementChild!
        );
        toolkit.log('Preferences Pane loaded!');
    }
}
