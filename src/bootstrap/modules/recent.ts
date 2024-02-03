import { config } from '../../../package.json';
import { isValid } from './utils';

export default function () {
    // 注册“最近在读”菜单
    addon.menu.register(
        'menuFile',
        {
            tag: 'menu',
            id: 'chartero-open-recent',
            label: addon.locale.recent,
            icon: `chrome://${config.addonName}/content/icons/icon.svg`,
        },
        'before',
        document.getElementById('menu_close') as XUL.Element
    );
    document
        .getElementById('chartero-open-recent')!
        .addEventListener(
            'popupshowing',
            function (this: XUL.Menu, event: Event) {
                const popup = event.target as XUL.MenuPopup;
                popup.replaceChildren();
                if (__dev__)
                    addon.log('recent menu', popup.childElementCount);

                getHistoryInfo().forEach(async info => {
                    const { id, name, image } = await info;
                    addon.ui.appendElement({
                        tag: 'menuitem',
                        classList: ['menuitem-iconic'],
                        styles: {
                            // @ts-ignore
                            'list-style-image': `url('${image}')`,
                        },
                        attributes: {
                            label: name,
                            tooltiptext: name,
                        },
                        listeners: [{
                            type: 'command',
                            listener: () => ZoteroPane.viewAttachment(id)
                        }],
                    }, popup);
                });
            }
        );
    addon.registerListener(Zotero_Tabs.tabsMenuPanel, 'popupshowing', addRecentTabsMenu);
    addon.registerListener(document.getElementById('zotero-tabs-menu-filter')!, 'input', addRecentTabsMenu);
}

async function addRecentTabsMenu() {
    const openedItems = Zotero_Tabs.getState().map(tab => tab.data?.itemID).filter(isValid),
        regex = new RegExp(`(${Zotero.Utilities.quotemeta(Zotero_Tabs._tabsMenuFilter)})`, 'gi');
    let tabIndex = Zotero_Tabs.tabsMenuList.querySelectorAll('*[tabindex]').length;
    if (__dev__)
        addon.log('recent tabs menu', tabIndex, regex);
    addon.ui.appendElement({
        tag: 'menuseparator',
        id: 'chartero-tabs-menu-separator',
        ignoreIfExists: true
    }, Zotero_Tabs.tabsMenuList);

    for (const info of getHistoryInfo()) {
        const { id, name, iconType } = await info;
        if (openedItems.includes(id) || !regex.test(name)) continue;

        const title = name.replace(regex, match => {
            const b = document.createElementNS('http://www.w3.org/1999/xhtml', 'b');
            b.textContent = match;
            return b.outerHTML;
        });
        addon.ui.appendElement({
            tag: 'toolbaritem',
            children: [{
                tag: 'toolbarbutton',
                attributes: {
                    flex: '1',
                    tabindex: ++tabIndex,
                    'aria-label': name,
                    'tooltiptext': name,
                },
                classList: ['zotero-tabs-menu-entry', 'title'],
                listeners: [{
                    type: 'command',
                    listener: () => ZoteroPane.viewAttachment(id)
                }],
                children: [{
                    tag: 'span',
                    classList: ['icon', 'icon-css', 'tab-icon', 'icon-item-type'],
                    attributes: { 'data-item-type': iconType }
                }, {
                    tag: 'description',
                    attributes: { flex: '1' },
                    properties: { innerHTML: title }
                }]
            }, {
                tag: 'toolbarbutton',
                classList: ['zotero-tabs-menu-entry'],
                attributes: { tabindex: ++tabIndex },
                styles: {
                    // @ts-ignore
                    'list-style-image': 'url(chrome://chartero/content/icons/history.svg)',
                    border: '0px',
                    color: 'var(--fill-secondary)',
                    fill: 'currentColor',
                    width: '22px',
                    pointerEvents: 'none'
                }
            }]
        }, Zotero_Tabs.tabsMenuList);
    }
}

function getHistoryInfo() {
    return addon.history
        .getAll()
        .map((his, id) => (his ? { tim: his.record.lastTime ?? 0, id } : undefined))
        .filter(isValid)
        .sort((a, b) => b.tim - a.tim)
        .slice(0, 10)
        .map(async his => {
            const attachment = await Zotero.Items.getAsync(his.id),
                topLevel = attachment.topLevelItem;
            return {
                id: his.id,
                name: topLevel.getField('title'),
                image: topLevel.getImageSrc(),
                iconType: topLevel.getItemTypeIconName()
            };
        });
}
