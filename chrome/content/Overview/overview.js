const localeStr = require('chrome://chartero/locale/overview.json');
const readingHistory = new HistoryLibrary();

// fetch("./debug.json")
//     .then(response => {
//         return response.json();
//     })
//     .then(jsondata => readingHistory.mergeJSON(jsondata));

function handler(event) {
    console.log(event);
}

window.addEventListener('DOMContentLoaded', () => {
    window.addEventListener('message', handler, false);

    
    console.log(readingHistory);
});
