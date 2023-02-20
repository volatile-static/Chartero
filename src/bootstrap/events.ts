import { config } from '../../package.json';
import { registerPanels, renderSummaryPanel } from './modules/sidebar';

/**
 * 初始化插件时调用
 */
export function onInit() {
    toolkit.log('Initializing Chartero addon...');
    // 注册设置面板
    toolkit.prefPane.register({
        pluginID: config.addonID,
        src: rootURI + 'content/preferences.xhtml',
        image: `chrome://${config.addonName}/content/icons/icon32.png`,
        label: 'Chartero',
    });

    // 添加工具栏按钮
    document.getElementById('zotero-collections-toolbar')?.appendChild(
        toolkit.ui.createElement(document, 'toolbarbutton', {
            id: 'chartero-toolbar-button',
            classList: ['zotero-tb-button'],
            attributes: { tooltiptext: toolkit.locale.dashboard },
            styles: {
                'list-style-image':
                    'url("chrome://chartero/content/icons/icon@16px.png")',
            } as Partial<CSSStyleDeclaration>,
            listeners: [{ type: 'command', listener: onToolButtonCommand }],
        })
    );

    // 监听条目选择事件
    Zotero.uiReadyPromise.then(() => {
        ZoteroPane.itemsView.onSelect.addListener(onItemSelect);
        ZoteroPane.collectionsView.onSelect.addListener(onCollectionSelect);
    });
    Zotero.Notifier.registerObserver(
        {
            notify: (
                event: _ZoteroTypes.Notifier.Event,
                type: _ZoteroTypes.Notifier.Type,
                ids: string[],
                extraData: _ZoteroTypes.anyObj
            ) => {
                if (
                    event == 'close' &&
                    ids[0] == Zotero.Chartero?.overviewTabID
                )
                    Zotero.Chartero.overviewTabID = undefined;
            },
        },
        ['tab']
    );
    registerPanels();
    toolkit.log('Chartero initialized successfully!');
}

function onToolButtonCommand(_: Event) {
    if (Zotero.Chartero.overviewTabID) {
        Zotero_Tabs.select(Zotero.Chartero.overviewTabID);
        return;
    }
    // 打开新的标签页
    const { id, container } = Zotero_Tabs.add({
        type: 'library',
        title: 'Chartero',
        select: true,
    });
    Zotero.Chartero.overviewTabID = id;

    const overview = toolkit.ui.appendElement(
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
    (overview.contentWindow as any).toolkit = toolkit;
}

async function onItemSelect() {
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

function onCollectionSelect() {
    const row = ZoteroPane.getCollectionTreeRow();
}
