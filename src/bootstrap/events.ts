import { config } from '../../package.json';
import registerPanels from './modules/sidebar';

/**
 * 初始化插件时调用
 */
export function onInit() {
    toolkit.log('Initializing Chartero addon...');
    // 注册设置面板
    // toolkit.prefPane.register({
    //     pluginID: config.addonID,
    //     src: rootURI + 'content/preferences.xhtml',
    //     image: `chrome://${config.addonName}/content/icons/icon32.png`,
    //     label: 'Chartero',
    // });

    // 添加工具栏按钮
    document.getElementById('zotero-collections-toolbar')?.appendChild(
        toolkit.ui.createElement(document, 'toolbarbutton', {
            id: 'chartero-toolbar-button',
            classList: ['zotero-tb-button'],
            attributes: { tooltiptext: toolkit.locale.dashboard },
            styles: {
                'list-style-image':
                    'url("chrome://chartero/content/icons/icon@16px.png")',
            },
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
                if (event == 'close' && ids[0] == Zotero.Chartero.overviewTabID)
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

function onItemSelect() {
    const items = ZoteroPane.getSelectedItems(true),
        dashboard = document.querySelector(
            '#zotero-view-tabbox .chartero-dashboard'
        ) as HTMLIFrameElement;
    if (items.length == 1)
        // 当前处于侧边栏标签页
        dashboard?.contentWindow?.postMessage({ id: items[0] }, '*');
}

function onCollectionSelect() {
    const row = ZoteroPane.getCollectionTreeRow();
}
