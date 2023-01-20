import { ClibpoardHelper } from "zotero-plugin-toolkit/dist/helpers/clipboard";
import { FilePickerHelper } from "zotero-plugin-toolkit/dist/helpers/filePicker"

export function copySVG2JPG(svg: string) {
    const img = new window.Image();
    img.onload = () => {
        const canvas = document.createElement('canvas'),
            ctx = canvas?.getContext('2d');
        canvas.height = img.height;
        canvas.width = img.width;
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        new ClibpoardHelper().addImage(canvas.toDataURL('image/png')).copy();
    };
    img.src = URL.createObjectURL(new window.Blob([svg], {
        type: 'image/svg+xml;charset-utf-16'
    }));
}

export async function saveSVG(svg: string) {
    //@ts-ignore
    const fileUtils = Zotero.getMainWindow().FileUtils,
        result = await new FilePickerHelper(
            localeStr.loadingImages,
            "save",
            [[localeStr.svg, "*.svg"]]
        ).open();
    result && Zotero.File.putContents(new fileUtils.File(result + '.svg'), svg);
}

export function showMessage(msg: string, icon: string) {
    new Notification('Chartero', {
        body: msg,
        icon
    });
}
