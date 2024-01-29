import { AttachmentRecord } from '$/history/data';
import type { AttachmentHistory } from '$/history/history';
import localeJSON from '../../../../addon/locale/zh-CN/chartero.json';
import fetchSync from './fetch';

function createAttachmentHistory(his: AttachmentHistory): AttachmentHistory {
    return {
        note: Zotero.Items.getByLibraryAndKey(1, his.note.key) as Zotero.Item,
        key: his.key,
        record: new AttachmentRecord(his.record),
    };
}

export default class Addon {
    get locale() {
        return localeJSON;
    }
    getGlobal(_: 'Zotero') {
        return Zotero;
    }
    log() {
        console.debug(...arguments);
    }
    getPref(key: string) {
        return fetchSync(`Zotero.Chartero.getPref('${key}')`);
    }
    setPref() {
        return;  // No-op
    }
    history = {
        getByAttachment(att: Zotero.Item | number): AttachmentHistory | null {
            const id = typeof att == 'number' ? att : att.id,
                res = fetchSync(`Zotero.Chartero.history.getByAttachment(${id})`);
            return res && createAttachmentHistory(res);
        },
        async getInTopLevel(item: Zotero.Item): Promise<AttachmentHistory[]> {
            const res = fetchSync(`Zotero.Chartero.history.getInTopLevel(Zotero.Items.get(${item.id}))`);
            return res.map(createAttachmentHistory);
        },
        getInTopLevelSync(item: Zotero.Item): AttachmentHistory[] {
            const res = fetchSync(`Zotero.Chartero.history.getInTopLevelSync(Zotero.Items.get(${item.id}))`);
            return res.map(createAttachmentHistory);
        },
        getInLibrary(id: number = 1): AttachmentHistory[] {
            const res = fetchSync(`Zotero.Chartero.history.getInLibrary(${id})`);
            return res.map(createAttachmentHistory);
        }
    }
    extraField = {
        _method: 'Zotero.Chartero.extraField.getExtraField(Zotero.Items.get(',
        getExtraField(item: Zotero.Item, field: string): string {
            return fetchSync(`${this._method}${item.id}), '${field}')`);
        },
        setExtraField(item: Zotero.Item, field: string, value: string): void {
            fetchSync(`${this._method}${item.id}), '${field}', '${value}')`);
        }
    }
}
