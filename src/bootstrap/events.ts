import { config } from '../../package.json';
import { addDebugMenu } from './modules/debug';
import { ICON_URL, DebuggerBackend } from './modules/utils';
import { wait } from 'zotero-plugin-toolkit';
import { G } from './modules/global';
import { mountMinimap, updateMinimap } from './modules/minimap/minimap';
import { registerPanels, renderSummaryPanel, updateDashboard } from './modules/sidebar';
import {
    hideDeleteMenuForHistory,
    initReaderAlert,
    patchedZoteroSearch,
    protectData,
} from './modules/history/misc';
import addImagesPanelForReader from './modules/images/images';
import buildRecentMenu from './modules/recent';
import addItemColumns from './modules/columns';
import initPrefsPane from './modules/prefs';

export function onAddonLoad() {
    addon.log('Initializing Chartero addon...');

    // 注册设置面板
    Zotero.PreferencePanes.register({
        pluginID: config.addonID,
        src: rootURI + 'content/preferences.xhtml',
        stylesheets: [rootURI + 'content/preferences.css'],
        image: rootURI + 'content/icons/icon32.png',
        helpURL: addon.locale.helpURL,
        label: config.addonName,
    });

    addon.notifierID = Zotero.Notifier.registerObserver({ notify: onNotify }, ['tab', 'setting', 'item']);

    addon.addPrefsObserver(() => {
        if (addon.getPref('scanPeriod') < 1) addon.setPref('scanPeriod', 1);
        addon.history.unregister();
        addon.history.register(addon.getPref('scanPeriod'));
    }, 'scanPeriod');
    addon.addPrefsObserver(() => {
        const summaryFrame = G('document').getElementById('chartero-summary-iframe'),
            summaryWin = (summaryFrame as HTMLIFrameElement)?.contentWindow;
        summaryWin?.postMessage('updateExcludedTags');
        addon.log('Updating excluded tags');
    }, 'excludedTags');

    addon.history.register(addon.getPref('scanPeriod'));
    addon.patchSearch.setData({
        target: Zotero.Search.prototype,
        funcSign: 'search',
        enabled: true,
        patcher: patchedZoteroSearch,
    });

    registerPanels();

    Zotero.Reader.registerEventListener('renderToolbar', e => onOpenReader(e.reader), config.addonID);
    Zotero.Reader._readers.forEach(onOpenReader);

    addItemColumns();
    addon.log('Chartero initialized successfully!');
    if (__dev__)
        // 路径以/test开头可绕过Zotero安全限制
        Zotero.Server.Endpoints['/test/chartero'] = DebuggerBackend;
}

export function onMainWindowLoad(win: _ZoteroTypes.MainWindow) {
    addon.registerListener(
        win.document.getElementById('zotero-itemmenu')!,
        'popupshowing',
        hideDeleteMenuForHistory,
    );

    (win as any).MozXULElement.insertFTLIfNeeded('chartero-prefs.ftl');

    // 注册Overview菜单
    addon.menu.register('menuView', {
        tag: 'menuitem',
        label: addon.locale.overview,
        commandListener: openOverview,
        icon: ICON_URL,
    });
    buildRecentMenu(win);
    if (__dev__) addDebugMenu();

    // 监听条目选择事件
    const pane = win.ZoteroPane_Local,
        itemsTree = win.document.getElementById('zotero-items-tree')!,
        observer: MutationObserver = new (win as any).MutationObserver(() => {
            if (pane.itemsView) {
                observer.disconnect();
                pane.itemsView.onSelect.addListener(onItemSelect);
            }
        });
    if (pane.itemsView)
        // 主窗口加载时已经初始化
        pane.itemsView.onSelect.addListener(onItemSelect);
    else observer.observe(itemsTree, { childList: true });
}

export function openReport() {
    Zotero.openInViewer(`chrome://${config.addonName}/content/report/index.html`, {
        onLoad(doc) {
            (doc.defaultView as any).wrappedJSObject.addon = addon;
            doc.defaultView?.postMessage('ready', '*');
        },
    });
}

export function openOverview() {
    const Zotero_Tabs = Zotero.getMainWindow().Zotero_Tabs;
    if (addon.overviewTabID) {
        Zotero_Tabs.select(addon.overviewTabID);
        return;
    }
    // 打开新的标签页
    const { id, container } = Zotero_Tabs.add({
        type: 'library',
        title: 'Chartero',
        data: {},
        select: true,
        onClose: () => (addon.overviewTabID = undefined),
    });
    addon.overviewTabID = id;

    const overview = addon.ui.appendElement(
        {
            tag: 'iframe',
            namespace: 'xul',
            attributes: {
                flex: 1,
                src: `chrome://${config.addonName}/content/overview/index.html`,
            },
        },
        container,
    ) as HTMLIFrameElement;
    (overview.contentWindow as any).addon = addon;
}

export function onHistoryRecord(reader: _ZoteroTypes.ReaderInstance) {
    updateDashboard(reader.itemID);
    // if (__dev__) window.console.time('updateMinimap');
    updateMinimap(reader);
    // if (__dev__) window.console.timeEnd('updateMinimap');
}

export async function onItemSelect() {
    // 仅用户操作GUI时响应
    if (Zotero.getMainWindow().Zotero_Tabs.selectedType != 'library') return;
    const ZoteroPane = Zotero.getActiveZoteroPane(),
        items = ZoteroPane.getSelectedItems(true),
        dashboard = Zotero.getMainWindow().document.querySelector(
            '#zotero-view-tabbox .chartero-dashboard',
        ) as HTMLIFrameElement,
        renderSummaryPanelDebounced = Zotero.Utilities.debounce(renderSummaryPanel, 233);
    // 当前处于侧边栏标签页
    if ('duplicates' == ZoteroPane.getCollectionTreeRow()?.type || !items.length) {
        // 当前选择整个分类
        const row = ZoteroPane.getCollectionTreeRow();
        addon.log('selected summary: ', row?.type);
        switch (row?.type) {
            case 'collection':
                renderSummaryPanelDebounced((row?.ref as Zotero.Collection).getChildItems(true));
                break;
            case 'search':
            case 'unfiled':
                renderSummaryPanelDebounced(await (row?.ref as Zotero.Search).search());
                break;
            case 'library':
            case 'group':
                // case 'feed':
                renderSummaryPanelDebounced(
                    await Zotero.Items.getAllIDs((row.ref as Zotero.DataObject).libraryID),
                );
                break;

            case 'trash':
            case 'duplicates':
            case 'publications':
            default:
                break;
        }
    } else if (items.length == 1) {
        const item = Zotero.Items.get(items[0]);
        if (item.isRegularItem())
            // 只有常规条目才有仪表盘
            dashboard?.contentWindow?.postMessage({ id: items[0] }, '*');
    } else
        renderSummaryPanelDebounced(items); // 当前选择多个条目
}

export async function onNotify(
    event: _ZoteroTypes.Notifier.Event,
    type: _ZoteroTypes.Notifier.Type,
    ids: string[] | number[],
    extraData: _ZoteroTypes.anyObj,
) {
    // addon.log('onNotify: ', event, type, ids, extraData);
    if (event == 'redraw' && type == 'setting' && ids[0] == config.addonName)
        initPrefsPane(extraData as Window);

    if (type == 'item') protectData(event, ids);
}

export async function onOpenReader(reader: _ZoteroTypes.ReaderInstance) {
    await wait.waitForReader(reader);
    if (addon.getPref('enableAllImages')) addImagesPanelForReader(reader);
    if (addon.getPref('enableMinimap')) mountMinimap(reader);
    if (addon.getPref('enableReaderAlert')) initReaderAlert(reader._iframe?.contentDocument);
}
