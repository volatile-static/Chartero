import type { TagElementProps } from 'zotero-plugin-toolkit/dist/tools/ui';
import { showMessage } from './utils';

export default function prefsPaneDoc() {
    async function onMergeClick(e: MouseEvent) {
        const btn = e.target as XUL.Button,
            txt = btn.previousElementSibling as HTMLTextAreaElement,
            str = txt.value;
        btn.disabled = true;
        try {
            const json = JSON.parse(str);
            if (typeof json.lib != 'number' && typeof json.items != 'object')
                throw new Error(toolkit.locale.prefs.historyParseError);

            const total = Object.keys(json.items).length,
                mainItem: Zotero.Item =
                    await Zotero._readingHistoryGlobal.getMainItem();
            Zotero.showZoteroPaneProgressMeter(
                toolkit.locale.migratingLegacy,
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
                    `zotero-reading-history#${key}\n${JSON.stringify(newJson)}`
                );
                noteItem.parentID = mainItem.id;
                noteItem.addRelatedItem(item as Zotero.Item);
                await noteItem.saveTx();

                Zotero.updateZoteroPaneProgressMeter((++i * 100) / total);
            }
            Zotero._readingHistoryGlobal.loadAll();
            showMessage(
                toolkit.locale.migrationFinished,
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
    return {
        tag: 'vbox',
        classList: ['main-section'],
        children: [
            {
                tag: 'h1',
                properties: {
                    innerText: toolkit.locale.prefs.storageTitle,
                },
            },
            {
                tag: 'textarea',
                attributes: {
                    placeholder: toolkit.locale.prefs.textAreaPlaceholder,
                },
                styles: { resize: 'vertical' },
                listeners: [{ type: 'input', listener: onJsonInput }],
            },
            {
                tag: 'button',
                namespace: 'xul',
                id: 'chartero-preferences-pane-history-import-area',
                attributes: {
                    label: toolkit.locale.prefs.importHistory,
                    native: true,
                },
                listeners: [{ type: 'command', listener: onMergeClick }],
            },
        ],
    } as TagElementProps;
}
