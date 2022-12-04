class CopyHelper {
    constructor() {
        this.transferable = Components.classes["@mozilla.org/widget/transferable;1"]
            .createInstance(Components.interfaces.nsITransferable);
        this.clipboardService = Components.classes["@mozilla.org/widget/clipboard;1"]
            .getService(Components.interfaces.nsIClipboard);
    }

    addText(source, type) {
        const str = Components.classes[
            "@mozilla.org/supports-string;1"
        ].createInstance(Components.interfaces.nsISupportsString);
        str.data = source;
        this.transferable.addDataFlavor(type);
        this.transferable.setTransferData(type, str, source.length * 2);
        return this;
    }

    addImage(source) {
        let parts = source.split(",");
        if (!parts[0].includes("base64"))
            return;
        let mime = parts[0].match(/:(.*?);/)[1];
        let bstr = atob(parts[1]);
        let n = bstr.length;
        let u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        let imgTools = Components.classes["@mozilla.org/image/tools;1"].getService(
            Components.interfaces.imgITools
        );
        let imgPtr = Components.classes[
            "@mozilla.org/supports-interface-pointer;1"
        ].createInstance(Components.interfaces.nsISupportsInterfacePointer);
        imgPtr.data = imgTools.decodeImageFromArrayBuffer(u8arr.buffer, mime);
        this.transferable.addDataFlavor(mime);
        this.transferable.setTransferData(mime, imgPtr, 0);
        return this;
    }

    copy() {
        this.clipboardService.setData(
            this.transferable,
            null,
            Components.interfaces.nsIClipboard.kGlobalClipboard
        );
    }
}

function copySVG2JPG(str) {
    const img = new window.Image();
    img.onload = () => {
        const canvas = document.createElement('canvas'),
            ctx = canvas.getContext && canvas.getContext('2d');
        canvas.height = img.height;
        canvas.width = img.width;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        new CopyHelper().addImage(canvas.toDataURL('image/png')).copy();
    };
    img.src = URL.createObjectURL(new window.Blob([str], {
        type: 'image/svg+xml;charset-utf-16'
    }));
}
