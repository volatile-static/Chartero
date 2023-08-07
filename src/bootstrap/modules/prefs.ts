import { importLegacyHistory } from "./history/misc";

export default function initPrefsPane(win: Window) {
    const btn = win.document.getElementById('chartero-preferences-pane-history-import-area') as XUL.Button;
    btn.addEventListener('command', onMergeClick);
    btn.previousElementSibling!.addEventListener('input', onJsonInput);
    win.document.getElementById('chartero-preferences-pane-history-auto-import')!.addEventListener('command', autoImportHistory);
    win.document.getElementById('chartero-preferences-pane-scanPeriod')?.addEventListener('input', onScanPeriodInput);
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
    } catch { }
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
