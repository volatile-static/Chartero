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
import { hideDeleteMenuForHistory, patchedZoteroSearch } from './modules/history/misc';
import { registerPanels } from './modules/sidebar';
import buildRecentMenu from './modules/recent';
import { onHistoryRecord, onItemSelect, onNotify } from './events';
import { addDebugMenu } from './modules/debug';
import addItemColumns from './modules/columns';

type DefaultPrefs = Omit<
    typeof config.defaultSettings,
    'excludedTags'
> & {
    excludedTags: number[];
};

export default class Addon extends toolBase.BasicTool {
    readonly ui: UITool;
    readonly menu: MenuManager;
    readonly patcher: PatcherManager;
    readonly reader: ReaderInstanceManager;
    readonly libTab: LibraryTabPanelManager;
    readonly prefPane: PreferencePaneManager;
    readonly readerTab: ReaderTabPanelManager;
    readonly history: ReadingHistory;
    readonly locale: typeof import('../../addon/locale/zh-CN/chartero.json');

    readonly rootURI = rootURI;
    overviewTabID?: string;
    private notifierID?: string;
    private readonly prefsObserverIDs: Symbol[] = [];

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
        this.ui.basicOptions.ui.enableElementDOMLog = __dev__;
    }

    getPref<K extends keyof DefaultPrefs>(key: K) {
        // 若获取不到则使用默认值
        const pref = Zotero.Prefs.get(`${packageName}.${key}`) ?? config.defaultSettings[key];
        if (__dev__)
            this.log(`Getting pref ${key}:`, pref);
        switch (typeof config.defaultSettings[key]) {
            case 'object':
                return JSON.parse(pref as string) as DefaultPrefs[K];
            case 'number':
                return Number(pref) as DefaultPrefs[K];
            default:
                return pref as DefaultPrefs[K];
        }
    }

    setPref<K extends keyof DefaultPrefs>(key: K, value?: DefaultPrefs[K]) {
        // 若未指定则设为默认值
        value ??= <DefaultPrefs[K]>config.defaultSettings[key];
        if (__dev__)
            this.log(`Setting pref ${key}:`, value);
        Zotero.Prefs.set(
            `${packageName}.${key}`,
            typeof value == 'object' ? JSON.stringify(value) : value
        );
    }

    // 仅供初始化调用
    private addPrefsObserver(fn: () => void, key: keyof DefaultPrefs) {
        this.prefsObserverIDs.push(
            Zotero.Prefs.registerObserver(`${packageName}.${key}`, fn)
        );
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
            helpURL: this.locale.helpURL,
            label: config.addonName,
        });

        document.getElementById('zotero-itemmenu')?.addEventListener(
            'popupshowing',
            hideDeleteMenuForHistory
        );
        addItemColumns();

        // 注册Overview菜单
        // this.menu.register('menuView', {
        //     tag: 'menuitem',
        //     label: this.locale.overview,
        //     commandListener: openOverview,
        //     icon: `chrome://${config.addonName}/content/icons/icon@16px.png`,
        // });
        buildRecentMenu();
        if (__dev__)
            addDebugMenu();

        // 监听条目选择事件
        Zotero.uiReadyPromise.then(() =>
            ZoteroPane.itemsView.onSelect.addListener(onItemSelect)
        );
        this.notifierID = Zotero.Notifier.registerObserver(
            { notify: onNotify },
            ['tab', 'setting', 'item']
        );
        registerPanels();

        this.addPrefsObserver(() => {
            if (this.getPref('scanPeriod') < 1)
                addon.setPref('scanPeriod', 1);
            this.history.unregister();
            this.history.register(this.getPref('scanPeriod'));
        }, 'scanPeriod');
        this.addPrefsObserver(() => {
            const summaryFrame = document.getElementById('chartero-summary-iframe'),
                summaryWin = (summaryFrame as HTMLIFrameElement)?.contentWindow;
            summaryWin?.postMessage('updateExcludedTags');
            addon.log('Updating excluded tags');
        }, 'excludedTags');

        this.history.register(addon.getPref("scanPeriod"));
        this.patcher.register(
            Zotero.Search.prototype,
            "search",
            patchedZoteroSearch
        );
        this.log('Chartero initialized successfully!');

        // 这两个图标要先在主窗口加载出来才能在reader里显示
        this.ui.appendElement({
            tag: 'div',
            styles: {
                backgroundImage: "url('chrome://chartero/content/icons/images-toggled.png')"
            },
            children: [{
                tag: 'div',
                styles: {
                    backgroundImage: "url('chrome://chartero/content/icons/images.png')"
                }
            }]
        }, document.lastChild as HTMLElement);
    }

    unload() {
        this.overviewTabID && Zotero_Tabs.close(this.overviewTabID);
        this.notifierID && Zotero.Notifier.unregisterObserver(this.notifierID);
        this.prefsObserverIDs.forEach(id => Zotero.Prefs.unregisterObserver(id));
        ZoteroPane.itemsView.onSelect.removeListener(onItemSelect);
        document.getElementById('zotero-itemmenu')?.removeEventListener(
            'popupshowing',
            hideDeleteMenuForHistory
        );
        toolBase.unregister(this);
    }
}
