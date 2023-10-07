import { ClipboardHelper } from 'zotero-plugin-toolkit/dist/helpers/clipboard';
import { FilePickerHelper } from 'zotero-plugin-toolkit/dist/helpers/filePicker';

export function copySVG2JPG(svg: string) {
    const img = new window.Image();
    img.onload = () => {
        const canvas = document.createElement('canvas'),
            ctx = canvas?.getContext('2d');
        canvas.height = img.height;
        canvas.width = img.width;
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        new ClipboardHelper().addImage(canvas.toDataURL('image/png')).copy();
    };
    img.src = URL.createObjectURL(
        new window.Blob([svg], {
            type: 'image/svg+xml;charset-utf-16',
        })
    );
}

export async function saveSVG(svg: string) {
    const result = await new FilePickerHelper(
        addon.locale.saveSVG,
        'save',
        [[addon.locale.svg, '*.svg']]
    ).open();
    if (result) {
        const File = addon.getGlobal('FileUtils').File;
        addon
            .getGlobal('Zotero')
            .File.putContents(new File(result + '.svg'), svg);
    }
}

export function showMessage(msg: string, icon: string) {
    new window.Notification('Chartero', {
        body: msg,
        icon,
    });
}

export async function waitForReader(reader: _ZoteroTypes.ReaderInstance) {
    for (let i = 0; i < 500; ++i)
        if (
            reader._internalReader &&
            (reader._lastView as any)?._iframeWindow &&
            Object.keys(reader._state.primaryViewStats).length
        )
            return true;
        else
            await Zotero.Promise.delay(20);
    throw new Error('Reader not found');
}

export function toTimeString(seconds: number | string) {
    function s2hour(s: number) {
        return {
            second: s % 60,
            minute: Math.round(s / 60) % 60,
            hour: Math.round(s / 3600),
        };
    }
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

export function accumulate<T>(arr: T[], key: keyof T): number {
    return arr.reduce((acc, cur) => acc + Number(cur[key]), 0);
}
