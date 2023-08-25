import type { ExportingMenuObject } from 'highcharts';
import { DialogPlugin } from 'tdesign-vue-next';

export function viewItemsInLib(itemIDs: number[]) {
    addon.getGlobal('ZoteroPane').selectItems(itemIDs);
}

export const buttons = {
    contextButton: {
        menuItems: [
            'viewFullscreen',
            'downloadSVG',
            'downloadJPEG',
            'viewData',
            'help',
        ],
    },
};

export function helpMessageOption(msg: string) {
    return {
        help: {
            onclick: function () {
                DialogPlugin.alert({
                    header: addon.locale.help,
                    body: h =>
                        h(
                            'div',
                            { style: { cursor: 'auto' } },
                            msg.split('\n').map(s => h('p', s))
                        ),
                    footer: false,
                    draggable: true,
                    width: '80%',
                    mode: 'modeless',
                    theme: 'info',
                });
            },
        } as ExportingMenuObject,
    };
}
