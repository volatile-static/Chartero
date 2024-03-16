import * as toolBase from 'zotero-plugin-toolkit/dist/basic';
import { ExtraFieldTool } from 'zotero-plugin-toolkit/dist/tools/extraField';
import { MenuManager } from 'zotero-plugin-toolkit/dist/managers/menu';
import { PatchHelper } from 'zotero-plugin-toolkit/dist/helpers/patch';
import { UITool } from 'zotero-plugin-toolkit/dist/tools/ui';
import { config, name as packageName } from '../../package.json';
import ReadingHistory from './modules/history/history';
import { onAddonLoad, onHistoryRecord, onItemSelect, onMainWindowLoad } from './events';
import { showMessage, WorkerManager } from './modules/utils';

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
    readonly worker = new WorkerManager(
        new ChromeWorker(`chrome://${packageName}/content/${config.addonName}-worker.js`)
    );
    readonly locale: typeof import('../../addon/locale/zh-CN/chartero.json');

    readonly rootURI = rootURI;
    overviewTabID?: string;
    notifierID?: string;
    private readonly prefsObserverIDs: symbol[] = [];
    private readonly listeners = new Array<{
        target: WeakRef<EventTarget>;
        type: string;
        listener: EventListenerOrEventListenerObject;
    }>();

    constructor() {
        super();
        if (!__dev__) {
            this.basicOptions.log.prefix = `[${config.addonName}]`;
            this.basicOptions.log.disableConsole = true;
        }
        this.basicOptions.debug.disableDebugBridgePassword = __dev__;
        this.ui = new UITool(this);
        this.menu = new MenuManager(this);
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
    addPrefsObserver(fn: () => void, key: keyof DefaultPrefs) {
        this.prefsObserverIDs.push(
            Zotero.Prefs.registerObserver(`${packageName}.${key}`, fn)
        );
    }

    registerListener(
        target: EventTarget,
        type: string,
        listener: EventListener,
        options?: AddEventListenerOptions | boolean
    ): boolean;
    registerListener<T extends EventTarget, K extends keyof GlobalEventHandlersEventMap>(
        target: T,
        type: K,
        listener: (this: T, ev: GlobalEventHandlersEventMap[K]) => any,
        options?: AddEventListenerOptions | boolean
    ) {
        if (typeof target?.addEventListener != "function")
            return false;
        target.addEventListener(type, listener as EventListener, options);
        this.listeners.push({ target: new WeakRef(target), type, listener });
        return true;
    }

    /**
     * 初始化插件时调用
     */
    init(win?: MainWindow) {
        try {
            if (win) {
                onMainWindowLoad(win);
            } else {
                onAddonLoad();
                onMainWindowLoad(Zotero.getMainWindow() as unknown as MainWindow);
            }
        } catch (error) {
            this.log(error);
        }
    }

    async unload() {
        this.patchSearch.disable();
        this.overviewTabID && (window as unknown as MainWindow).Zotero_Tabs.close(this.overviewTabID);
        this.notifierID && Zotero.Notifier.unregisterObserver(this.notifierID);
        this.prefsObserverIDs.forEach(id => Zotero.Prefs.unregisterObserver(id));
        this.listeners.forEach(({ target, type, listener }) =>
            target?.deref()?.removeEventListener(type, listener)
        );
        (Zotero.getActiveZoteroPane().itemsView as any).onSelect.removeListener(onItemSelect);
        await this.worker.close();
        toolBase.unregister(this);
    }

    async test(key: string) { // create a new file attachment
        if (!__dev__) return;

        const item = Zotero.Items.get(411);
        const attachment = new Zotero.Item('attachment');
        attachment.libraryID = item.libraryID;
        attachment.parentID = item.id;
        attachment.attachmentLinkMode = Zotero.Attachments.LINK_MODE_IMPORTED_FILE;
        attachment.attachmentFilename = key + '.json';
        attachment.attachmentPath = `storage:${key}.json`;
        attachment.attachmentContentType = 'application/json';
        attachment.setField('title', key);
        await attachment.saveTx({ skipSelect: true, skipNotifier: true });
        const path = await Zotero.Attachments.createDirectoryForItem(attachment);
        const file = Zotero.File.pathToFile(PathUtils.join(path, key + '.json'));
        Zotero.File.putContents(file, JSON.stringify({ key }));

        // this.log(await attachment.getFilePathAsync());
        const res = await fetch(attachment.getLocalFileURL());
        this.log(await res.json());
    }
}
