import * as toolBase from 'zotero-plugin-toolkit/dist/basic';
import { MenuManager } from 'zotero-plugin-toolkit/dist/managers/menu';
import { PreferencePaneManager } from 'zotero-plugin-toolkit/dist/managers/preferencePane';
import { ReaderInstanceManager } from 'zotero-plugin-toolkit/dist/managers/readerInstance';
import { LibraryTabPanelManager } from 'zotero-plugin-toolkit/dist/managers/libraryTabPanel';
import { ReaderTabPanelManager } from 'zotero-plugin-toolkit/dist/managers/readerTabPanel';
import { UITool } from 'zotero-plugin-toolkit/dist/tools/ui';
import { config } from '../../package.json';
import ReadingHistory from './modules/history/history';
import { registerPanels } from './modules/sidebar';
import buildRecentMenu from './modules/recent';
import initPrefsPane from './modules/prefs';
import { onItemSelect } from './events';

export default class Addon extends toolBase.BasicTool {
    readonly menu: MenuManager;
    // readonly column: ItemTreeManager;
    readonly libTab: LibraryTabPanelManager;
    readonly prefPane: PreferencePaneManager;
    readonly readerTab: ReaderTabPanelManager;
    readonly reader: ReaderInstanceManager;
    readonly ui: UITool;
    readonly history: ReadingHistory;
    readonly locale: typeof import('../../addon/locale/zh-CN/chartero.json');

    overviewTabID?: string;

    constructor() {
        super();
        if (!__dev__) {
            this.basicOptions.log.prefix = `[${config.addonName}]`;
            this.basicOptions.log.disableConsole = true;
        }
        this.basicOptions.debug.disableDebugBridgePassword = __dev__;
        this.menu = new MenuManager(this);
        this.prefPane = new PreferencePaneManager(this);
        // this.column = new ItemTreeManager(this);
        this.libTab = new LibraryTabPanelManager(this);
        this.readerTab = new ReaderTabPanelManager(this);
        this.reader = new ReaderInstanceManager(this);
        this.ui = new UITool(this);
        this.history = new ReadingHistory(this);
        this.locale = JSON.parse(
            Zotero.File.getContentsFromURL(
                'chrome://chartero/locale/chartero.json'
            )
        );
    }

    getPref(key: string) {
        return Zotero.Prefs.get(`${config.addonName}.${key}`);
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
        Zotero.Notifier.registerObserver(
            {
                notify: (
                    event: _ZoteroTypes.Notifier.Event,
                    type: _ZoteroTypes.Notifier.Type,
                    ids: string[] | number[],
                    extraData: _ZoteroTypes.anyObj
                ) => {
                    if (event == 'close' && ids[0] == addon.overviewTabID)
                        addon.overviewTabID = undefined;

                    if (event == 'redraw' && type == 'setting' && ids[0] == config.addonName)
                        initPrefsPane(extraData as Window);
                },
            },
            ['tab', 'setting']
        );
        registerPanels();
        this.log('Chartero initialized successfully!');
    }

    unload() {
        this.overviewTabID && Zotero_Tabs.close(this.overviewTabID);
        toolBase.unregister(this);
    }
}
