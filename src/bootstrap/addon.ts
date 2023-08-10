import * as toolBase from 'zotero-plugin-toolkit/dist/basic';
import { MenuManager } from 'zotero-plugin-toolkit/dist/managers/menu';
import { PreferencePaneManager } from 'zotero-plugin-toolkit/dist/managers/preferencePane';
import { ReaderInstanceManager } from 'zotero-plugin-toolkit/dist/managers/readerInstance';
import { LibraryTabPanelManager } from 'zotero-plugin-toolkit/dist/managers/libraryTabPanel';
import { ReaderTabPanelManager } from 'zotero-plugin-toolkit/dist/managers/readerTabPanel';
import { PatcherManager } from 'zotero-plugin-toolkit/dist/managers/patch';
import { UITool } from 'zotero-plugin-toolkit/dist/tools/ui';
import { config, name as packageName } from '../../package.json';
import ReadingHistory from './modules/history/history';
import { patchedZoteroSearch } from './modules/history/misc';
import { registerPanels } from './modules/sidebar';
import buildRecentMenu from './modules/recent';
import { onHistoryRecord, onItemSelect, onNotify } from './events';

export default class Addon extends toolBase.BasicTool {
    readonly menu: MenuManager;
    readonly libTab: LibraryTabPanelManager;
    readonly prefPane: PreferencePaneManager;
    readonly readerTab: ReaderTabPanelManager;
    readonly reader: ReaderInstanceManager;
    readonly ui: UITool;
    readonly history: ReadingHistory;
    readonly patcher: PatcherManager;
    readonly locale: typeof import('../../addon/locale/zh-CN/chartero.json');

    overviewTabID?: string;
    private notifierID?: string;

    constructor() {
        super();
        if (!__dev__) {
            this.basicOptions.log.prefix = `[${config.addonName}]`;
            this.basicOptions.log.disableConsole = true;
        }
        this.basicOptions.debug.disableDebugBridgePassword = __dev__;
        this.menu = new MenuManager(this);
        this.prefPane = new PreferencePaneManager(this);
        this.libTab = new LibraryTabPanelManager(this);
        this.readerTab = new ReaderTabPanelManager(this);
        this.reader = new ReaderInstanceManager(this);
        this.ui = new UITool(this);
        this.history = new ReadingHistory(this, onHistoryRecord);
        this.patcher = new PatcherManager(this);
        this.locale = JSON.parse(
            Zotero.File.getContentsFromURL(
                'chrome://chartero/locale/chartero.json'
            )
        );
    }

    getPref(key: string) {
        return Zotero.Prefs.get(`${packageName}.${key}`);
    }

    /**
     * 初始化插件时调用
     */
    init() {
        this.log('Initializing Chartero addon...');
        // 注册设置面板
        this.prefPane.register({
            pluginID: config.addonID,
            src: rootURI + 'content/preferences.xhtml',
            stylesheets: [rootURI + 'content/preferences.css'],
            image: `chrome://${config.addonName}/content/icons/icon32.png`,
            label: config.addonName,
        });

        // 注册Overview菜单
        // this.menu.register('menuView', {
        //     tag: 'menuitem',
        //     label: this.locale.overview,
        //     commandListener: openOverview,
        //     icon: `chrome://${config.addonName}/content/icons/icon@16px.png`,
        // });
        buildRecentMenu();

        // 监听条目选择事件
        Zotero.uiReadyPromise.then(() =>
            ZoteroPane.itemsView.onSelect.addListener(onItemSelect)
        );
        this.notifierID = Zotero.Notifier.registerObserver(
            { notify: onNotify },
            ['tab', 'setting', 'item']
        );
        registerPanels();

        this.history.register(addon.getPref("scanPeriod") as number);
        this.patcher.register(
            Zotero.Search.prototype,
            "search",
            patchedZoteroSearch
        );
        this.log('Chartero initialized successfully!');
    }

    unload() {
        this.overviewTabID && Zotero_Tabs.close(this.overviewTabID);
        this.notifierID && Zotero.Notifier.unregisterObserver(this.notifierID);
        ZoteroPane.itemsView.onSelect.removeListener(onItemSelect);
        toolBase.unregister(this);
    }
}
