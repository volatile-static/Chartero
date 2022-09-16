const localeStr = require('chrome://chartero/locale/datatree.json');
const iconMap = require('chrome://chartero/content/DataTree/iconmap.json');

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
            $('#chartero-data-info').html(localeStr['period'] + selected.data.period + 's.');
            break;

        default:
            $('#chartero-data-info').html(localeStr['details']);
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
        if (!parent)
            continue;
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
    rawJson = event.data;
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
    $("li").each(function () {
        $(this).attr('title', localeStr[$(this).attr('key')]);
    });
}

function initToolButton() {
    $("#chartero-data-status-bar li").tooltip();
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
    $('#tool-button-import').click(function () {
        window.parent.postMessage(null, '*');
    });
}

window.addEventListener('DOMContentLoaded', () => {
    initToolButton();
    window.addEventListener('message', handler, false);
});
