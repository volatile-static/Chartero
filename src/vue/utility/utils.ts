import { accumulate } from '$/utils';
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

export function splitOtherData(data: Array<Highcharts.PointOptionsObject>) {
    const sum = accumulate(data, 'y'),
        isOther = (y: number) => y / Math.max(1, sum) < 0.02;
    return [
        data.filter(d => !isOther(d.y ?? 0)),
        data.filter(d => isOther(d.y ?? 0))
    ]
}
