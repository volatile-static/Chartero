const localeStr = require('chrome://chartero/locale/overview.json');
const readingHistory = new HistoryLibrary();

window.addEventListener('DOMContentLoaded', (event) => {
    if (event.target.URL.indexOf('index') > 0) {
        const noteKey = Zotero.Prefs.get("chartero.dataKey");
        const noteItem = Zotero.Items.getByLibraryAndKey(1, noteKey);
        readingHistory.mergeJSON(JSON.parse(noteItem.getNote()));
    } else if (event.target.URL.indexOf('skyline') > 0) {
        document.getElementById('skyline-frame').contentWindow.postMessage({
            history: readingHistory
        }, '*');
    } else if (event.target.URL.indexOf('timeline') > 0) {
        document.getElementById('timeline-frame').contentWindow.postMessage({
            history: readingHistory
        }, '*')
    }
});
