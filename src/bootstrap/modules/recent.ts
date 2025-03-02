import { ICON_URL } from './utils';

export default function (win: _ZoteroTypes.MainWindow) {
    // 注册“最近在读”菜单
    addon.menu.register(
        'menuFile',
        {
            tag: 'menu',
            id: 'chartero-open-recent',
            label: addon.locale.recent,
            icon: ICON_URL,
        },
        'before',
        win.document.getElementById('menu_close') as unknown as XULElement
    );
    win.document.getElementById('chartero-open-recent')!.addEventListener('popupshowing', event => {
        const popup = event.target as XUL.MenuPopup,
            info = getHistoryInfo();
        popup.replaceChildren();
        for (const { id, name, image } of info)
            addon.ui.appendElement({
                tag: 'menuitem',
                namespace: 'xul',
                classList: ['menuitem-iconic'],
                styles: {
                    listStyleImage: `url('${image}')`
                },
                attributes: {
                    label: name,
                    tooltiptext: name,
                },
                listeners: [{
                    type: 'command',
                    listener: () => Zotero.getActiveZoteroPane().viewAttachment(id)
                }],
            }, popup);
    });
    addon.registerListener(win.Zotero_Tabs.tabsMenuPanel, 'popupshowing', addRecentTabsMenu);
    addon.registerListener(win.document.getElementById('zotero-tabs-menu-filter')!, 'input', addRecentTabsMenu);
}

async function addRecentTabsMenu({ target }: Event) {
    const win = (target as any).ownerGlobal as _ZoteroTypes.MainWindow,
        openedItems = win.Zotero_Tabs.getState().map(tab => tab.data?.itemID).filter(i => !!i),
        regex = new RegExp(`(${Zotero.Utilities.quotemeta(win.Zotero_Tabs._tabsMenuFilter)})`, 'gi');
    let tabIndex = win.Zotero_Tabs.tabsMenuList.querySelectorAll('*[tabindex]').length;
    if (__dev__)
        addon.log('recent tabs menu', tabIndex, regex);
    addon.ui.appendElement({
        tag: 'menuseparator',
        id: 'chartero-tabs-menu-separator',
        ignoreIfExists: true
    }, win.Zotero_Tabs.tabsMenuList);

    for (const { id, name, iconType } of getHistoryInfo()) {
        if (openedItems.includes(id) || !regex.test(name)) continue;

        const title = name.replace(regex, match => {
            const b = win.document.createElementNS('http://www.w3.org/1999/xhtml', 'b');
            b.textContent = match;
            return b.outerHTML;
        });
        addon.ui.appendElement({
            tag: 'div',
            classList: ['row'],
            attributes: { draggable: false },
            children: [{
                tag: 'div',
                attributes: {
                    flex: '1',
                    tabindex: ++tabIndex,
                    'aria-label': name,
                    'tooltiptext': name,
                },
                classList: ['zotero-tabs-menu-entry', 'title'],
                listeners: [{
                    type: 'click',
                    listener: () => Zotero.getActiveZoteroPane().viewAttachment(id)
                }],
                children: [{
                    tag: 'span',
                    classList: ['icon', 'icon-css', 'tab-icon', 'icon-item-type'],
                    attributes: { 'data-item-type': iconType }
                }, {
                    tag: 'label',
                    attributes: { flex: '1' },
                    properties: { innerHTML: title }
                }]
            }, {
                tag: 'div',
                classList: ['zotero-tabs-menu-entry'],
                attributes: { tabindex: ++tabIndex },
                styles: {
                    listStyleImage: 'url(chrome://chartero/content/icons/history.svg)',
                    border: '0px',
                    color: 'var(--fill-secondary)',
                    fill: 'currentColor',
                    width: '22px',
                    pointerEvents: 'none'
                }
            }]
        }, win.Zotero_Tabs.tabsMenuList);
    }
}

function getHistoryInfo() {
    return addon.history
        .getAll()
        .map((his, id) => (his ? { tim: his.record.lastTime ?? 0, id } : undefined))
        .filter(i => !!i)
        .sort((a, b) => b.tim - a.tim)
        .slice(0, 10)
        .map(his => {
            try {
                const attachment = Zotero.Items.get(his.id),
                    topLevel = attachment.topLevelItem;
                return {
                    id: his.id,
                    name: topLevel.getField('title'),
                    image: topLevel.getImageSrc(),
                    iconType: topLevel.getItemTypeIconName()
                };
            } catch (error) {
                addon.log('unload recent menu', his.id, error);
                return null;
            }
        })
        .filter(i => !!i);
}
