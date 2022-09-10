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

const iconMap = {
    artwork: 'chrome://zotero/skin/treeitem-artwork.png',
    attachmentLink: 'chrome://zotero/skin/treeitem-attachment-link.png',
    attachmentPDF: 'chrome://zotero/skin/treeitem-attachment-pdf.png',
    attachmentPDFLink: 'chrome://zotero/skin/treeitem-attachment-pdf-link.png',
    attachmentSnapshot: 'chrome://zotero/skin/treeitem-attachment-snapshot.png',
    attachmentWebLink: 'chrome://zotero/skin/treeitem-attachment-web-link.png',
    audioRecording: 'chrome://zotero/skin/treeitem-audioRecording.png',
    bill: 'chrome://zotero/skin/treeitem-bill.png',
    blogPost: 'chrome://zotero/skin/treeitem-blogPost.png',
    book: 'chrome://zotero/skin/treeitem-book.png',
    bookSection: 'chrome://zotero/skin/treeitem-bookSection.png',
    case: 'chrome://zotero/skin/treeitem-case.png',
    computerProgram: 'chrome://zotero/skin/treeitem-computerProgram.png',
    conferencePaper: 'chrome://zotero/skin/treeitem-conferencePaper.png',
    dictionaryEntry: 'chrome://zotero/skin/treeitem-dictionaryEntry.png',
    email: 'chrome://zotero/skin/treeitem-email.png',
    encyclopediaArticle: 'chrome://zotero/skin/treeitem-encyclopediaArticle.png',
    film: 'chrome://zotero/skin/treeitem-film.png',
    forumPost: 'chrome://zotero/skin/treeitem-forumPost.png',
    hearing: 'chrome://zotero/skin/treeitem-hearing.png',
    instantMessage: 'chrome://zotero/skin/treeitem-instantMessage.png',
    interview: 'chrome://zotero/skin/treeitem-interview.png',
    journalArticle: 'chrome://zotero/skin/treeitem-journalArticle.png',
    letter: 'chrome://zotero/skin/treeitem-letter.png',
    magazineArticle: 'chrome://zotero/skin/treeitem-magazineArticle.png',
    manuscript: 'chrome://zotero/skin/treeitem-manuscript.png',
    map: 'chrome://zotero/skin/treeitem-map.png',
    newspaperArticle: 'chrome://zotero/skin/treeitem-newspaperArticle.png',
    note: 'chrome://zotero/skin/treeitem-note.png',
    noteSmall: 'chrome://zotero/skin/treeitem-note-small.png',
    patent: 'chrome://zotero/skin/treeitem-patent.png',
    podcast: 'chrome://zotero/skin/treeitem-podcast.png',
    preprint: 'chrome://zotero/skin/treeitem-preprint.png',
    presentation: 'chrome://zotero/skin/treeitem-presentation.png',
    radioBroadcast: 'chrome://zotero/skin/treeitem-radioBroadcast.png',
    report: 'chrome://zotero/skin/treeitem-report.png',
    statute: 'chrome://zotero/skin/treeitem-statute.png',
    thesis: 'chrome://zotero/skin/treeitem-thesis.png',
    tvBroadcast: 'chrome://zotero/skin/treeitem-tvBroadcast.png',
    videoRecording: 'chrome://zotero/skin/treeitem-videoRecording.png',
    webpageGray: 'chrome://zotero/skin/treeitem-webpage-gray.png',
    webpage: 'chrome://zotero/skin/treeitem-webpage.png',
};

var rawJson = "{}";
var readingHistory;

function onSelect(event, data) {
    if (data.selected.length > 1) {
        $('#chartero-data-info').html('Selected ' + data.selected.length + ' nodes.');
        return;
    }
    const selected = data.instance.get_node(data.selected[0]);

    if (!selected.data) {
$('#chartero-data-info').html('Select a node for details.');
return;
    }
    switch (selected.data.type) {
        case 'item':
            const read = selected.children.length;
            const total = readingHistory.items[selected.data.id].n;
            $('#chartero-data-info').html('已读' + read + '页 / 共' + total + '页');
            break;

        case 'page':
            const parent = data.instance.get_node(selected.parent);
            const his = readingHistory.items[parent.data.id];
            const s = page_getTotalSeconds(his.p[selected.data.page]);
            $('#chartero-data-info').html('第' + selected.data.page + '页读了' + s + '秒');
            break;

        case 'time':
            $('#chartero-data-info').html('Period: ' + selected.data.period + 's.');
            break;

        default:
            $('#chartero-data-info').html('Select a node for details.');
            break;
    }
}

function genTreeView() {
    const result = {
        // 根节点显示文库名称
        text: Zotero.Libraries._cache[readingHistory.lib].name,
        icon: 'chrome://zotero/skin/treesource-library.png',
        state: { opened: true },
        children: []
    };

    for (const it in readingHistory.items) {  // 遍历条目节点
        const parent = Zotero.Items.get(it).parentItem;
        const item = {
            icon: iconMap[parent.itemType],
            text: parent.getField('title'),  // .parent
            data: {
                type: 'item',
                id: it
            },
            children: []
        };
        for (const page in readingHistory.items[it].p) {  // 遍历页码
            const ph = readingHistory.items[it].p[page];
            const pt = {
                text: 'page ' + page,
                icon: false,
                data: {
                    type: 'page',
                    page: page
                },
                children: []
            };
            for (tim in ph.t)   // 添加阅读时间
                pt.children.push({
                    text: new Date(tim * 1000).toLocaleString(),
                    icon: false,
                    data: {
                        type: 'time',
                        period: ph.t[tim]
                    }
                });
            item.children.push(pt);
        }
        result.children.push(item);
    }
    return result;
}

function handler(event) {
    readingHistory = JSON.parse(event.data);
    if (!readingHistory)
        return;
    const histree = {
        core: {
            check_callback: true,
            themes: { stripes: true },
            responsive: true,
            ellipsis: true,
            data: [genTreeView()]
        }
    };
    $('#chartero-data-tree').jstree('destroy');  // 清空上次画的树
    $('#chartero-data-tree').on('changed.jstree', onSelect).jstree(histree);
    rawJson = event.data;
}

function initToolButton() {
    $("#chartero-data-status-bar li").hover(
        function () {
            $(this).addClass("ui-state-hover");
        },
        function () {
            $(this).removeClass("ui-state-hover");
        }
    );
    $("#chartero-data-status-bar li").mousedown(
        function () {
            $(this).addClass("ui-state-active");
        }
    );
    $("#chartero-data-status-bar li").mouseup(
        function () {
            $(this).removeClass("ui-state-active");
        }
    );
    $("#chartero-data-status-bar li").tooltip();
    $("#tool-button-copy").click(
        function () {
            new CopyHelper().addText(rawJson, 'text/unicode').copy();
        }
    );
    $("#tool-button-collapse").click(
        function () {
            $('#chartero-data-tree').jstree('close_all');
        }
    );
    
    // $(document).tooltip();
}

window.addEventListener('DOMContentLoaded', () => {
    initToolButton();
    window.addEventListener('message', handler, false);
})
