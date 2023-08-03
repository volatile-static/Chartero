import { showMessage } from './utils';

export default function initPrefsPane(win: Window) {
    const btn = win.document.getElementById('chartero-preferences-pane-history-import-area') as XUL.Button;
    btn.addEventListener('command', onMergeClick);
    btn.previousElementSibling!.addEventListener('input', onJsonInput);
}

async function onMergeClick(e: MouseEvent) {
    const btn = e.target as XUL.Button,
        txt = btn.previousElementSibling as HTMLTextAreaElement,
        str = txt.value;
    btn.disabled = true;
    try {
        const json = JSON.parse(str);
        if (typeof json.lib != 'number' && typeof json.items != 'object')
            throw new Error(addon.locale.historyParseError);

        const total = Object.keys(json.items).length,
            mainItem: Zotero.Item =
                await Zotero._readingHistoryGlobal.getMainItem();
        Zotero.showZoteroPaneProgressMeter(
            addon.locale.migratingLegacy,
            true
        );
        window.focus();
        let i = 0;
        for (const key in json.items) {
            const item = Zotero.Items.getByLibraryAndKey(1, key);
            if (!item) continue;

            const oldJson = json.items[key],
                newJson = {
                    numPages: oldJson.n,
                    pages: {} as _ZoteroTypes.anyObj,
                },
                noteItem = new Zotero.Item('note');
            for (const page in oldJson.p)
                newJson.pages[page] = { p: oldJson.p[page].t };

            noteItem.setNote(
                `chartero#${key}\n${JSON.stringify(newJson)}`
            );
            noteItem.parentID = mainItem.id;
            noteItem.addRelatedItem(item as Zotero.Item);
            await noteItem.saveTx();

            Zotero.updateZoteroPaneProgressMeter((++i * 100) / total);
        }
        // Zotero._readingHistoryGlobal.loadAll();
        showMessage(
            addon.locale.migrationFinished,
            'chrome://chartero/content/icons/accept.png'
        );
    } catch (error) {
        window.alert(error);
    } finally {
        Zotero.hideZoteroPaneOverlays();
    }
}

function onJsonInput(e: Event) {
    ((e.target as XUL.Element).nextElementSibling as XUL.Button).disabled =
        false;
}
