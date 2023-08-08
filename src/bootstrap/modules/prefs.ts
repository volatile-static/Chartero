import { importLegacyHistory } from "./history/misc";

export default function initPrefsPane(win: Window) {
    // 绑定事件
    const btn = win.document.getElementById('chartero-preferences-pane-history-import-area') as XUL.Button;
    btn.addEventListener('command', onMergeClick);
    btn.previousElementSibling!.addEventListener('input', onJsonInput);
    win.document.getElementById('chartero-preferences-pane-history-auto-import')!.addEventListener('command', autoImportHistory);
    win.document.getElementById('chartero-preferences-pane-scanPeriod')?.addEventListener('input', onScanPeriodInput);
    win.document.getElementById('chartero-preferences-pane-refreshTagsTable')?.addEventListener(
        'command',
        () => refreshExcludedTags(win.document)
    );
    refreshExcludedTags(win.document);
}

// 渲染标签
function refreshExcludedTags(doc: Document) {
    const tags = addon.getPref('excludedTags'),
        table = doc.getElementById('chartero-preferences-pane-excludedTagsTable') as HTMLDivElement;
    while (table.firstChild)
        table.removeChild(table.firstChild);
    try {
        JSON.parse(String(tags)).forEach((tag: number) => addon.ui.appendElement({
            tag: 'div',
            id: 'chartero-preferences-pane-ignoredTag-' + tag,
            classList: ['chartero-preferences-pane-ignoredTag'],
            properties: { innerHTML: Zotero.Tags.getName(tag) },
            listeners: [{ type: 'click', listener: onTagClick }]
        }, table));
    } catch (error) {
        addon.log('Resetting ignoredTags: ', error);
        Zotero.Prefs.set('chartero.excludedTags', JSON.stringify([]));
    }
}

function onTagClick(event: MouseEvent) {
    const div = event.target as HTMLDivElement,
        win = div.ownerDocument.defaultView;
    if (win?.confirm(addon.locale.confirmRemoveExcludedTag)) {
        const tagID = div.id.split('-').at(-1),
            pref = addon.getPref('excludedTags'),
            tags = JSON.parse(String(pref));
        tags.splice(tags.indexOf(tagID), 1);
        Zotero.Prefs.set('chartero.excludedTags', JSON.stringify(tags));
        refreshExcludedTags(win.document);
    }
}

async function onMergeClick(e: MouseEvent) {
    const btn = e.target as XUL.Button,
        txt = btn.previousElementSibling as HTMLTextAreaElement,
        str = txt.value;
    btn.disabled = true;
    importLegacyHistory(str);
}

function onJsonInput(e: Event) {
    ((e.target as XUL.Element).nextElementSibling as XUL.Button).disabled =
        false;
}

function onScanPeriodInput(e: Event) {
    try {
        const period = parseInt((e.target as HTMLInputElement).value);
        if (isNaN(period))
            throw new Error('Invalid period');
        addon.history.unregister();
        addon.history.register(period);
    } catch {
        (e.target as HTMLInputElement).value = '1';
    }
}

function autoImportHistory(e: MouseEvent) {
    const dataKey = addon.getPref('dataKey');
    if (dataKey) {
        const noteItem = Zotero.Items.getByLibraryAndKey(1, String(dataKey));
        if (noteItem instanceof Zotero.Item && noteItem.isNote()) {
            importLegacyHistory(noteItem.note);
            return;
        }
    }
    window.alert(addon.locale.legacyNotFound);
}
