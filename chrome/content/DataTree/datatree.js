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

var rawJson = "{}";

function genTreeView(history) {
    const result = {};
    if (!history)
        return result;
    // 根节点显示文库名称
    result.text = Zotero.Libraries._cache[history.lib].name;
    result.children = new Array();

    for (const it in history.items) {  // 遍历条目节点
        const item = {
            text: Zotero.Items.get(it).getField('title'),  // .parent
            children: []
        };
        for (const page in history.items[it].p) {  // 遍历页码
            const ph = history.items[it].p[page];
            const pt = {
                text: 'page ' + page,
                children: []
            };
            for (tim in ph.t)  // 添加阅读时间
                pt.children.push((new Date(tim * 1000)).toLocaleString());
            item.children.push(pt);
        }
        result.children.push(item);
    }
    return result;
}

function handler(event) {
    const histree = {
        core: {
            data: [genTreeView(JSON.parse(event.data))]
        }
    };
    $('#chartero-data-tree').jstree('destroy');  // 清空上次画的树
    $('#chartero-data-tree').jstree(histree);
    rawJson = event.data;
}

window.addEventListener('DOMContentLoaded', () => {
    $('.rawbutton').button()
        .click(function (event) {
            event.preventDefault();
            new CopyHelper().addText(rawJson, 'text/unicode').copy();
        });
    window.addEventListener('message', handler, false);
})
