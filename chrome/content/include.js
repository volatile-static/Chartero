if (!Zotero.Chartero) {  // 导入插件脚本
    const fileLoader = Components.classes["@mozilla.org/moz/jssubscript-loader;1"]
        .getService(Components.interfaces.mozIJSSubScriptLoader);
    const scripts = ['chartero',
                     'jQuery/jQuery'
                     ];
    scripts.forEach(s => fileLoader.loadSubScript('chrome://chartero/content/' + s + '.js', {}, "UTF-8"));
}

window.addEventListener(
    "load",
    function () {
        Zotero.Chartero.init();
    },
    false
);
