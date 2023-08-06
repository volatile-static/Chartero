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
        addon.locale.loadingImages,
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
