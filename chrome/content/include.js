if (!Zotero.Chartero) {
    var fileLoader = Components.classes["@mozilla.org/moz/jssubscript-loader;1"]
        .getService(Components.interfaces.mozIJSSubScriptLoader);
    var scripts = ['chartero'];
    scripts.forEach(s => fileLoader.loadSubScript('chrome://chartero/content/' + s + '.js', {}, "UTF-8"));
}

window.addEventListener(
    "load",
    function (e) {
        Zotero.Chartero.init();
        if (window.ZoteroPane) {
        }
    },
    false
);