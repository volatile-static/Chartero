import { importLegacyHistory, compressHistory } from "./history/misc";

export default function initPrefsPane(win: Window) {
    // 绑定事件
    const $: typeof document.getElementById = win.document.getElementById.bind(win.document),
        btn = $('chartero-preferences-pane-history-import-area') as XUL.Button;
    btn.addEventListener('command', onMergeClick);
    btn.parentElement!.previousElementSibling!.addEventListener('input', onJsonInput);
    $('chartero-preferences-pane-history-compress')?.addEventListener('command', compressHistory);
    $('chartero-preferences-pane-history-auto-import')?.addEventListener('command', autoImportHistory);
    $('chartero-preferences-pane-refreshTagsTable')?.addEventListener(
        'command',
        () => refreshExcludedTags(win.document)
    );
    refreshExcludedTags(win.document);
    updateHistorySize(win.document);
}

// 渲染标签
function refreshExcludedTags(doc: Document) {
    const tags = addon.getPref('excludedTags'),
        table = doc.getElementById('chartero-preferences-pane-excludedTagsTable') as HTMLDivElement;
    while (table.firstChild)
        table.removeChild(table.firstChild);
    try {
        tags.forEach((tag: number) => addon.ui.appendElement({
            tag: 'div',
            id: 'chartero-preferences-pane-ignoredTag-' + tag,
            classList: ['chartero-preferences-pane-ignoredTag'],
            properties: { innerHTML: Zotero.Tags.getName(tag) },
            listeners: [{ type: 'click', listener: onTagClick }]
        }, table));
    } catch (error) {
        addon.log('Resetting ignoredTags: ', error);
        addon.setPref('excludedTags');
    }
    if (!table.childElementCount)
        table.innerText = addon.locale.noExcludedTags;
}

function onTagClick(event: MouseEvent) {
    const div = event.target as HTMLDivElement,
        win = div.ownerDocument.defaultView;
    if (win?.confirm(addon.locale.confirmRemoveExcludedTag)) {
        const tagID = div.id.split('-').at(-1),
            tags = addon.getPref('excludedTags');
        tags.splice(tags.indexOf(Number(tagID)), 1);
        Zotero.Prefs.set('chartero.excludedTags', JSON.stringify(tags));
        refreshExcludedTags(win.document);
    }
}

async function onMergeClick(e: MouseEvent) {
    const btn = e.target as XUL.Button,
        txt = btn.parentElement!.previousElementSibling as HTMLTextAreaElement,
        str = txt.value;
    btn.disabled = true;
    importLegacyHistory(str);
}

function onJsonInput(e: Event) {
    ((e.target as XUL.Element).nextElementSibling!.lastChild as XUL.Button).disabled =
        false;
}

function autoImportHistory() {
    const dataKey = addon.getPref('dataKey' as any),
        period = addon.getPref('scanPeriod');
    if (dataKey) {
        if (period && period > 999)  // 旧版单位是毫秒
            addon.setPref('scanPeriod', Math.ceil(period / 1000));
        const noteItem = Zotero.Items.getByLibraryAndKey(1, String(dataKey));
        if (noteItem instanceof Zotero.Item && noteItem.isNote()) {
            importLegacyHistory(noteItem.note);
            Zotero.Prefs.clear('chartero.dataKey');
            return;
        }
    }
    window.alert(addon.locale.legacyNotFound);
}

function updateHistorySize(doc: Document) {
    const size = addon.history.getAll().reduce(
        (acc, cur) => acc += (cur?.note.note.length ?? 0)
        , 0
    ) / 1024;
    doc.getElementById(
        'chartero-preferences-pane-history-size'
    )?.setAttribute(
        'data-l10n-args',
        JSON.stringify({ size: size.toFixed(2) })
    );
}
