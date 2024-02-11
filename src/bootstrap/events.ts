import { config } from '../../package.json';
import { renderSummaryPanel, updateDashboard } from './modules/sidebar';
import { protectData } from './modules/history/misc';
import { updateMinimap } from './modules/minimap/minimap';
import initPrefsPane from './modules/prefs';
import { waitForReader } from './modules/utils';
import addImagesPanelForReader from './modules/images/images';

export function openReport() {
    Zotero.openInViewer(
        `chrome://${config.addonName}/content/report/index.html`,
        {
            onLoad(doc) {
                (doc.defaultView as any).wrappedJSObject.addon = addon;
                doc.defaultView?.postMessage('ready', '*')
            }
        }
    );
}

export function openOverview() {
    if (addon.overviewTabID) {
        Zotero_Tabs.select(addon.overviewTabID);
        return;
    }
    // 打开新的标签页
    const { id, container } = Zotero_Tabs.add({
        type: 'library',
        title: 'Chartero',
        select: true,
        onClose: () => addon.overviewTabID = undefined,
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
        container
    ) as HTMLIFrameElement;
    (overview.contentWindow as any).addon = addon;
}

export function onHistoryRecord(reader: _ZoteroTypes.ReaderInstance) {
    updateDashboard(reader.itemID);
    if (__dev__)
        window.console.time('updateMinimap');
    updateMinimap(reader);
    if (__dev__)
        window.console.timeEnd('updateMinimap');
}

export async function onItemSelect() {
    // 仅用户操作GUI时响应
    if (Zotero_Tabs.selectedType != 'library')
        return;
    const items = ZoteroPane.getSelectedItems(true),
        dashboard = document.querySelector(
            '#zotero-view-tabbox .chartero-dashboard'
        ) as HTMLIFrameElement,
        renderSummaryPanelDebounced = Zotero.Utilities.debounce(
            renderSummaryPanel,
            233
        );
    // 当前处于侧边栏标签页
    if (items.length == 1) {
        const item = Zotero.Items.get(items[0]);
        if (item.isRegularItem())  // 只有常规条目才有仪表盘
            dashboard?.contentWindow?.postMessage({ id: items[0] }, '*');
    }
    else if (
        ZoteroPane.itemsView.rowCount > items.length &&
        items.length > 1 &&
        'duplicates' != ZoteroPane.getCollectionTreeRow()?.type
    )
        renderSummaryPanelDebounced(items); // 当前选择多个条目
    else {
        // 当前选择整个分类
        const row = ZoteroPane.getCollectionTreeRow();
        addon.log('selected summary: ', row?.type);
        switch (row?.type) {
            case 'collection':
                renderSummaryPanelDebounced(
                    (row?.ref as Zotero.Collection).getChildItems(true)
                );
                break;
            case 'search':
            case 'unfiled':
                renderSummaryPanelDebounced(
                    await (row?.ref as Zotero.Search).search()
                );
                break;
            case 'library':
            case 'group':
                // case 'feed':
                renderSummaryPanelDebounced(
                    await Zotero.Items.getAllIDs((row.ref as Zotero.DataObject).libraryID)
                );
                break;

            case 'trash':
            case 'duplicates':
            case 'publications':
            default:
                break;
        }
    }
}

export async function onNotify(
    event: _ZoteroTypes.Notifier.Event,
    type: _ZoteroTypes.Notifier.Type,
    ids: string[] | number[],
    extraData: _ZoteroTypes.anyObj
) {
    // addon.log('onNotify: ', event, type, ids, extraData);
    if (event == 'redraw' && type == 'setting' && ids[0] == config.addonName)
        initPrefsPane(extraData as Window);

    if (type == 'item')
        protectData(event, ids);
}

export async function onOpenReader(
    event: _ZoteroTypes.Reader.EventParams<'renderToolbar'>
) {
    if (!addon.getPref('enableAllImages'))
        return;
    await waitForReader(event.reader);
    addImagesPanelForReader(event.reader);
}
