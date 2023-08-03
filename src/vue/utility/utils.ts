import type { ExportingMenuObject } from 'highcharts';
import { DialogPlugin } from 'tdesign-vue-next';

function s2hour(s: number) {
    return {
        second: s % 60,
        minute: Math.round(s / 60) % 60,
        hour: Math.round(s / 3600),
    };
}

export function toTimeString(seconds: number | string) {
    const tim = s2hour(
        typeof seconds == 'number' ? seconds : parseInt(seconds)
    );
    let label = '';
    if (tim.hour) label = tim.hour + addon.locale.hours;
    if (tim.minute) label += tim.minute + addon.locale.minutes;
    if (label.length < 1) label = seconds + addon.locale.seconds;
    else if (!tim.hour && tim.second)
        label += tim.second + addon.locale.seconds;
    return label;
}

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
