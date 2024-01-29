import * as toolBase from 'zotero-plugin-toolkit/dist/basic';
import { ExtraFieldTool } from 'zotero-plugin-toolkit/dist/tools/extraField';
import { MenuManager } from 'zotero-plugin-toolkit/dist/managers/menu';
import { PatchHelper } from 'zotero-plugin-toolkit/dist/helpers/patch';
import { UITool } from 'zotero-plugin-toolkit/dist/tools/ui';
import { config, name as packageName } from '../../package.json';
import ReadingHistory from './modules/history/history';
import { hideDeleteMenuForHistory, patchedZoteroSearch } from './modules/history/misc';
import { registerPanels } from './modules/sidebar';
import buildRecentMenu from './modules/recent';
import { onHistoryRecord, onItemSelect, onNotify, openOverview } from './events';
import { addDebugMenu } from './modules/debug';
import addItemColumns from './modules/columns';
import { showMessage } from './modules/utils';

type DefaultPrefs = Omit<
    typeof config.defaultSettings,
    'excludedTags'
> & {
    excludedTags: number[];
};

export default class Addon extends toolBase.BasicTool {
    readonly extraField: ExtraFieldTool;
    readonly ui: UITool;
    readonly menu: MenuManager;
    readonly patchSearch: PatchHelper;
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
        this.ui = new UITool(this);
        this.extraField = new ExtraFieldTool(this);
        this.history = new ReadingHistory(this, onHistoryRecord);
        this.patchSearch = new PatchHelper();
        this.locale = JSON.parse(
            Zotero.File.getContentsFromURL(
                'chrome://chartero/locale/chartero.json'
            )
        );
        this.ui.basicOptions.ui.enableElementDOMLog = __dev__;
    }

    async translateLocaleStrings(): Promise<typeof this.locale> {
        if (!Zotero.PDFTranslate?.api?.translate) {
            showMessage(
                'PDFTranslate not found, using default locale!',
                'chrome://chartero/content/icons/exclamation.png'
            );
            return this.locale;
        }
        const locale = JSON.parse(
            Zotero.File.getContentsFromURL(rootURI + 'locale/zh-CN/chartero.json')
        ), translate = (str: string) =>
            str.startsWith('http') ? str : Zotero.PDFTranslate.api.translate(str, {
                pluginID: config.addonID,
                langfrom: 'zh-CN',
                langto: Zotero.locale
            }).then(
                (res: _ZoteroTypes.anyObj) => res.status == 'success' ? res.result : str
            );
        for (const key in locale)
            if (typeof locale[key] == 'string')
                locale[key] = await translate(locale[key]);
            else if (Array.isArray(locale[key]))
                locale[key] = await Promise.all(
                    locale[key].map(translate)
                );
            else
                for (const k in locale[key])
                    locale[key][k] = await translate(locale[key][k]);
        showMessage('Locale strings translated successfully!', 'chrome://chartero/content/icons/accept.png');
        return locale;
    }

    getPref<K extends keyof DefaultPrefs>(key: K) {
        // 若获取不到则使用默认值
        const pref = Zotero.Prefs.get(`${packageName}.${key}`) ?? JSON.stringify(
            config.defaultSettings[key]
        );
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
        Zotero.PreferencePanes.register({
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
        this.menu.register('menuView', {
            tag: 'menuitem',
            label: this.locale.overview,
            commandListener: openOverview,
            icon: `chrome://${config.addonName}/content/icons/icon.svg`,
        });
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
        this.patchSearch.setData({
            target: Zotero.Search.prototype,
            funcSign: 'search',
            enabled: true,
            patcher: patchedZoteroSearch
        });
        this.log('Chartero initialized successfully!');

        if (__dev__)
            // 路径以/test开头可绕过Zotero安全限制
            Zotero.Server.Endpoints['/test/chartero'] = class implements _ZoteroTypes.Server.Endpoint {
                supportedMethods = ['POST'];
                init: _ZoteroTypes.Server.initMethodPromise = async function (options) {
                    const headers = {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*' // 允许跨域
                    };
                    try {
                        addon.log('eval cmd:', options.data);
                        const result = eval(options.data);
                        addon.log(result);
                        return [200, headers, JSON.stringify(result.then ? await result : result)];
                    } catch (error) {
                        Zotero.logError(error);
                        if (error instanceof Error)
                            return [400, headers, JSON.stringify({ msg: error.message })];
                        else
                            return [500, headers, JSON.stringify(error)];
                    }
                };
            }
    }

    unload() {
        this.patchSearch.disable();
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

    async test(cmd: string) {
        this.log(window.matchMedia('(prefers-color-scheme: dark)'));
    }
}
