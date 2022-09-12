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

    copy() {
        this.clipboardService.setData(
            this.transferable,
            null,
            Components.interfaces.nsIClipboard.kGlobalClipboard
        );
    }
}
