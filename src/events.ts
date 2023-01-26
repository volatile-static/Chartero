import { addonName, addonID } from '../package.json';
import registerPanels from './modules/sidebar';
import renderOverview from "./iframes/overview";

/**
 * 初始化插件时调用
 */
export function onInit() {
  const document = toolkit.getGlobal('document');
  toolkit.log(document, window, window.window);

  toolkit.log('Initializing Chartero addon...');
  toolkit.prefPane.register({  // 注册设置面板
    pluginID: addonID,
    src: `chrome://${addonName}/content/preferences.xhtml`,
    image: `chrome://${addonName}/content/icons/icon32.png`,
    // scripts: [`chrome://${addonName}/content/scripts/prefs.js`],
    label: 'Chartero'
  });
  // toolkit.ui.appendElement(  // 某些React组件需要head节点
  //   { tag: 'head' },
  //   document.documentElement
  // );
  toolkit.ui.appendElement({  // 加载样式文件
    tag: 'link',
    directAttributes: {
      type: 'text/css',
      rel: 'stylesheet',
      href: `chrome://${addonName}/content/chartero.css`,
    }
  }, document.documentElement);
  document.getElementById('zotero-collections-toolbar')?.appendChild( // 添加工具栏按钮
    toolkit.ui.createElement(document, 'toolbarbutton', {
      id: 'chartero-toolbar-button',
      classList: ['zotero-tb-button'],
      attributes: { tooltiptext: localeStr.dashboard },
      listeners: [{ type: 'command', listener: onToolButtonCommand }]
    })
  );
  Zotero.uiReadyPromise.then(() => {  // 监听条目选择事件
    ZoteroPane.itemsView.onSelect.addListener(onItemSelect);
    ZoteroPane.collectionsView.onSelect.addListener(onCollectionSelect);
  });
  registerPanels();

  // const id = Zotero.Notifier.registerObserver({
  //   notify: (
  //     event: _ZoteroTypes.Notifier.Event,
  //     type: _ZoteroTypes.Notifier.Type,
  //     ids: string[],
  //     extraData: _ZoteroTypes.anyObj
  //   ) => {
  //     if (!Zotero.Chartero)
  //       Zotero.Notifier.unregisterObserver(id);
  //     toolkit.log(event, type, ids, extraData);
  //   }
  // }, ['tab', 'file', 'item']);
  toolkit.log('Chartero initialized successfully!');
}

function onToolButtonCommand(_: Event) {
  const { container } = Zotero_Tabs.add({  // 打开新的标签页
    type: 'library',
    title: 'Chartero',
    select: true
  });
  // const w = toolkit.ui.appendElement({ tag: 'div' }, container);
  // const fr = toolkit.ui.appendElement({
  //   tag: 'iframe',
  //   namespace: 'xul',
  //   attributes: {
  //     flex: 1,
  //     src: `chrome://${addonName}/content/overview.html`
  //   }
  // }, w) as HTMLIFrameElement;
  // fr.contentWindow?.addEventListener('DOMContentLoaded', () => {

  //   const root = fr.contentDocument?.getElementById('root');
  // });

  const root = toolkit.ui.appendElement({
    tag: 'html:div',
    namespace: 'html',
    attributes: { flex: 1 }
  }, container);
    renderOverview(root as HTMLDivElement);
}

function onItemSelect() {
  const items = ZoteroPane.getSelectedItems();
}

function onCollectionSelect() {
  const row = ZoteroPane.getCollectionTreeRow();
}
