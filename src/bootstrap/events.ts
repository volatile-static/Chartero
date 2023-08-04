import { config } from '../../package.json';
import { renderSummaryPanel } from './modules/sidebar';
import initPrefsPane from './modules/prefs';

function openOverview(_: Event) {
    if (Zotero.Chartero.overviewTabID) {
        Zotero_Tabs.select(Zotero.Chartero.overviewTabID);
        return;
    }
    Zotero.showZoteroPaneProgressMeter(addon.locale.drawInProgress);

    // 打开新的标签页
    const { id, container } = Zotero_Tabs.add({
        type: 'library',
        title: 'Chartero',
        select: true,
    });
    Zotero.Chartero.overviewTabID = id;

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

export async function onItemSelect() {
    const items = ZoteroPane.getSelectedItems(true),
        dashboard = document.querySelector(
            '#zotero-view-tabbox .chartero-dashboard'
        ) as HTMLIFrameElement,
        renderSummaryPanelDebounced = Zotero.Utilities.debounce(
            renderSummaryPanel,
            233
        );
    // 当前处于侧边栏标签页
    if (items.length == 1)
        dashboard?.contentWindow?.postMessage({ id: items[0] }, '*');
    else if (ZoteroPane.itemsView.rowCount > items.length && items.length > 1)
        renderSummaryPanelDebounced(items); // 当前选择多个条目
    else {
        // 当前选择整个分类
        const row = ZoteroPane.getCollectionTreeRow();
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
                renderSummaryPanelDebounced(
                    await Zotero.Items.getAllIDs((row.ref as any).libraryID)
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
    if (event == 'close' && type == 'tab' && ids[0] == addon.overviewTabID)
        addon.overviewTabID = undefined;

    if (event == 'redraw' && type == 'setting' && ids[0] == config.addonName)
        initPrefsPane(extraData as Window);

    if (type == 'item') {
        const restore = (item: Zotero.DataObject) => {
            Zotero.debug(addon.locale.deletingItem);
            Zotero.debug(item);
            // 恢复被删的条目
            item.deleted = false;
            item.saveTx({ skipDateModifiedUpdate: true, skipNotifier: true });
        },
            items = ids.map((id) => Zotero.Items.get(id)), // 触发事件的条目
            mainItems = items.filter(addon.history.isMainItem); // 筛选出的主条目

        switch (event) {
            case "trash":
                mainItems.forEach(restore); // 恢复所有被删的主条目
                for (const it of items)
                    if (await addon.history.isHistoryNote(it))
                        restore(it); // 恢复主条目下所有笔记
                break;

            case "modify":
                mainItems.forEach((it) => {
                    // TODO: 若archiveLocation已被修改，则此处无法获取，考虑patch setField
                });
                for (const it of items)
                    if (await addon.history.isHistoryNote(it))
                        window.alert(addon.locale.modifyingNote);
                break; // TODO：此处并不能阻止修改，且保存时需skipNotify

            default:
                break;
        }
    }
}

// 防止阅读器侧边栏搜索到主条目下的笔记
export const patchedZoteroSearch = (origin: Function) =>
    async function (this: Zotero.Search, asTempTable: boolean) {
        const ids: number[] = await origin.apply(this, asTempTable), // 原始搜索结果
            conditions = this.getConditions(); // 当前搜索的条件
        if (
            !asTempTable &&
            !conditions[2] &&
            conditions[0]?.condition == "libraryID" &&
            conditions[0]?.operator == "is" &&
            conditions[1]?.condition == "itemType" &&
            conditions[1]?.operator == "is" &&
            conditions[1]?.value == "note"
        ) {
            const mainItemKey = (
                await addon.history.getMainItem(parseInt(conditions[0].value))
            ).key; // 必须在这个if语句内，否则可能产生递归！
            // window.console.trace(ids, conditions, mainItemKey);
            return ids.filter(
                (id) => Zotero.Items.get(id).parentItemKey != mainItemKey
            );
        } else return ids;
    }
