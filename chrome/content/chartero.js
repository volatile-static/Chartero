Zotero.Chartero = new function () {
    // Default values
    this.userAgent =
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3538.77 Safari/537.36";
   
    /**
     * Initiate addon
     */
    this.init = async function () {
        // Register the callback in Zotero as an item observer
        var notifierID = Zotero.Notifier.registerObserver(
            this.notifierCallback,
            ["item"]
        );
        // Unregister callback when the window closes (important to avoid a memory leak)
        window.addEventListener(
            "unload",
            function (e) {
                Zotero.Notifier.unregisterObserver(notifierID);
            },
            false
        );
        // 等待数据维护更新完毕
        // await Zotero.Schema.schemaUpdatePromise;

        this.initPref();
        Components.utils.import("resource://gre/modules/osfile.jsm");
        Zotero.debug("Init Jasminum ...");
    };

    /**
     * Initiate Jasminum preferences
     */
    this.initPref = function () {
        if (Zotero.Prefs.get("jasminum.pdftkpath") === undefined) {
            var pdftkpath = "C:\\Program Files (x86)\\PDFtk Server\\bin";
            if (Zotero.isLinux) {
                pdftkpath = "/usr/bin";
            } else if (Zotero.isMac) {
                pdftkpath = "/opt/pdflabs/pdftk/bin";
            }
            Zotero.Prefs.set("jasminum.pdftkpath", pdftkpath);
        }
        if (Zotero.Prefs.get("jasminum.autoupdate") === undefined) {
            Zotero.Prefs.set("jasminum.autoupdate", false);
        }
        if (Zotero.Prefs.get("jasminum.namepatent") === undefined) {
            Zotero.Prefs.set("jasminum.namepatent", "{%t}_{%g}");
        }
        if (Zotero.Prefs.get("jasminum.zhnamesplit") === undefined) {
            Zotero.Prefs.set("jasminum.zhnamesplit", true);
        }
        if (Zotero.Prefs.get("jasminum.rename") === undefined) {
            Zotero.Prefs.set("jasminum.rename", true);
        }
        if (Zotero.Prefs.get("jasminum.autobookmark") === undefined) {
            Zotero.Prefs.set("jasminum.autobookmark", true);
        }
        if (Zotero.Prefs.get("jasminum.autolanguage") === undefined) {
            Zotero.Prefs.set("jasminum.autolanguage", false);
        }
        if (Zotero.Prefs.get("jasminum.language") === undefined) {
            Zotero.Prefs.set("jasminum.language", 'zh-CN');
        }
        if (Zotero.Prefs.get("jasminum.foreignlanguage") === undefined) {
            Zotero.Prefs.set("jasminum.foreignlanguage", 'en-US');
        }
        if (Zotero.Prefs.get("jasminum.attachment") === undefined) {
            Zotero.Prefs.set("jasminum.attachment", 'pdf');
        }
        if (Zotero.Prefs.get("jasminum.citefield") === undefined) {
            Zotero.Prefs.set("jasminum.citefield", 'extra');
        }
    };

    this.notifierCallback = {
        // Check new added item, and adds meta data.
        notify: async function (event, type, ids, extraData) {
            // var automatic_pdf_download_bool = Zotero.Prefs.get('zoteroscihub.automatic_pdf_download');
            if (event == "add") {
                // Auto update meta data
                var addedItems = Zotero.Items.get(ids);
                if (Zotero.Prefs.get("jasminum.autoupdate")) {
                    Zotero.debug("** Jasminum new items added.");
                    var items = [];
                    for (let item of addedItems) {
                        if (Zotero.Jasminum.UI.isCNKIFile(item)) {
                            items.push(item);
                        }
                    }
                    Zotero.debug(`** Jasminum add ${items.length} items`);
                    Zotero.Jasminum.searchItems(items);
                }
                // Split or merge name
                if (!Zotero.Prefs.get("jasminum.zhnamesplit")) {
                    Zotero.debug("** Jasminum merge CN name");
                    var items = [];
                    for (let item of addedItems) {
                        if (
                            Zotero.Jasminum.CNDB.includes(
                                item.getField("libraryCatalog")
                            )
                        ) {
                            items.push(item);
                        }
                    }
                    Zotero.Jasminum.mergeName(items);
                }
                // Add bookmark after new PDF is attached.
                if (Zotero.Prefs.get("jasminum.autobookmark")) {
                    for (let item of addedItems) {
                        if (
                            item.parentID &&
                            Zotero.ItemTypes.getName(
                                item.parentItem.itemTypeID
                            ) == "thesis" &&
                            item.parentItem.getField("libraryCatalog") ==
                            "CNKI" &&
                            item.attachmentContentType == "application/pdf"
                        ) {
                            Zotero.debug("***** New PDF item is added");
                            await Zotero.Jasminum.addBookmarkItem(item);
                        }
                    }
                }
                // Set default language field
                if (Zotero.Prefs.get("jasminum.autolanguage")) {
                    for (let item of addedItems) {
                        if (
                            item.getField("language").match(/中文|cn|zh/)
                        ) {
                            Zotero.debug("***** Set default language");
                            await Zotero.Jasminum.setLanguage(item);
                        }
                    }
                }
            }
        },
    };
}
