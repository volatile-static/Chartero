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

function splitText(text: string): string[] {
    // 假名、汉字、韩文
    const characters = /[\u3040-\u30FF\u4E00-\u9FAF\uAC00-\uD7AF]/;
    return text.split(/[\s,]+/).flatMap(word => {
        if (characters.test(word)) return [...word];
        return word;
    }).filter(Boolean);
}

export function jaccardSimilarity(text1: string, text2: string) {
    const set1 = new Set(splitText(text1)),
        set2 = new Set(splitText(text2)),
        intersection = new Set([...set1].filter(x => set2.has(x))),
        union = new Set([...set1, ...set2]);

    return intersection.size / union.size;
}