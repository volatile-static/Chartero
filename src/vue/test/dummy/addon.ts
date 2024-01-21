import localeJSON from '../../../../addon/locale/zh-CN/chartero.json';
import fetchSync from './fetch';

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
}
