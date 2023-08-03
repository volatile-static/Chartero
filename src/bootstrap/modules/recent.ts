export default function () {
    // 注册“最近在读”菜单
    addon.menu.register(
        'menuFile',
        {
            tag: 'menu',
            id: 'chartero-open-recent',
            label: addon.locale.recent,
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
                while (popup.hasChildNodes())
                    popup.removeChild(popup.lastChild!);

                addon.history
                    .getAll()
                    .map((his, id) =>
                        his ? { tim: his.record.lastTime ?? 0, id } : undefined
                    )
                    .filter(obj => obj)
                    .sort((a, b) => b!.tim - a!.tim)
                    .slice(0, 10)
                    .forEach(async obj => {
                        const attachment = await Zotero.Items.getAsync(obj!.id),
                            topLevel = attachment.parentItemID
                                ? attachment.parentItem!
                                : attachment,
                            name = topLevel.getField('title') as string;
                        addon.ui.appendElement(
                            {
                                tag: 'menuitem',
                                classList: ['menuitem-iconic'],
                                styles: {
                                    // @ts-ignore
                                    'list-style-image': `url('${topLevel.getImageSrc()}')`,
                                },
                                attributes: {
                                    label: name,
                                    tooltiptext: name,
                                },
                                listeners: [
                                    {
                                        type: 'command',
                                        listener: () => {
                                            ZoteroPane.viewAttachment(obj!.id);
                                        },
                                    },
                                ],
                            },
                            popup
                        );
                    });
            }
        );
}
