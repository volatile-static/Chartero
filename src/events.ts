import Addon from "./addon";
import AddonModule from "./module";
import { addonName, addonID, addonRef } from "../package.json";

class AddonEvents extends AddonModule {
  constructor(parent: Addon) {
    super(parent);
  }

  async onInit() {
    // this._debug = this._Addon.toolkit.Tool.log;
    // This function is the setup code of the addon
    this._debug(`init called`);
    this._Addon.Zotero = Zotero;

    if (!this._Addon.development)
      this._Addon.toolkit.Tool.logOptionsGlobal.prefix = `[${addonName}]`;
    this._Addon.toolkit.Tool.logOptionsGlobal.disableConsole = !this._Addon.development;


    this._Addon.locale = JSON.parse(
      Zotero.File.getContentsFromURL('chrome://chartero/locale/chartero.json')
    );

    this._Addon.toolkit.Tool.log(this._Addon);
    // Initialize notifier callback
    this.initNotifier();

    // Initialize preference window
    this.initPrefs();

    this._Addon.views.initViews();
  }

  private initNotifier() {
    const callback = {
      notify: async (
        event: string,
        type: string,
        ids: Array<string>,
        extraData: { [key: string]: any }
      ) => {
        // You can add your code to the corresponding notify type
        if (
          event == "select" &&
          type == "tab" &&
          extraData[ids[0]].type == "reader"
        ) {
          // Select a reader tab
          const reader = Zotero.Reader.getByTabID(ids[0]);
          await reader._initPromise;
          if (!reader)
            return;
          this.addImagesPreviewer(reader);
        }
        if (event == "add" && type == "item") {
          // Add an item
        }
      },
    };

    // Register the callback in Zotero as an item observer
    let notifierID = Zotero.Notifier.registerObserver(callback, [
      "tab",
      "item",
      "file",
    ]);

    // Unregister callback when the window closes (important to avoid a memory leak)
    Zotero.getMainWindow().addEventListener(
      "unload",
      function (e: Event) {
        Zotero.Notifier.unregisterObserver(notifierID);
      },
      false
    );
  }

  initPrefs() {
    this._Addon.toolkit.Tool.log(this._Addon.rootURI);
    const prefOptions = {
      pluginID: addonID,
      src: this._Addon.rootURI + "chrome/content/preferences.xhtml",
      label: "Chartero",
      image: `chrome://${addonRef}/content/icons/icon.png`,
      extraDTD: [`chrome://${addonRef}/locale/overlay.dtd`],
      defaultXUL: true,
      onload: (win: Window) => {
        this._Addon.prefs.initPreferences(win);
      },
    };
    if (this._Addon.toolkit.Compat.isZotero7()) {
      Zotero.PreferencePanes.register(prefOptions);
    } else {
      this._Addon.toolkit.Compat.registerPrefPane(prefOptions);
    }
  }

  private unInitPrefs() {
    if (!this._Addon.toolkit.Compat.isZotero7()) {
      this._Addon.toolkit.Compat.unregisterPrefPane();
    }
  }

  onUnInit(): void {
    this._Addon.toolkit.Tool.log(`uninit called`);
    this.unInitPrefs();
    //  Remove elements and do clean up
    this._Addon.views.unInitViews();
    // Remove addon object
    Zotero.Chartero = undefined;
  }

  // 给阅读器左侧边栏添加图片预览
  private addImagesPreviewer(reader: _ZoteroReaderInstance) {
    (reader._iframeWindow as any).wrappedJSObject.charteroProgressmeter = () => {
      const popMsg: _ZoteroProgressWindow = new Zotero.ProgressWindow(),
        localeStr = this._Addon.locale.imagesLoaded;
      popMsg.changeHeadline('', 'chrome://chartero/content/icons/icon.png', 'Chartero');
      popMsg.addDescription('‾‾‾‾‾‾‾‾‾‾‾‾');
      let prog: ItemProgress = new popMsg.ItemProgress(
        'chrome://chartero/content/icons/accept.png',
        this._Addon.locale.loadingImages
      );
      popMsg.show();
      return function (percentage: number, page: number) {
        if (percentage >= 100) {
          prog.setProgress(100);
          prog.setText(localeStr);
          popMsg.startCloseTimer(2333, true);
        } else {
          prog.setProgress(percentage);
          prog.setText('Scanning images in page ' + (page || 0));
        }
      };
    }
    const readoc: Document = reader._iframeWindow.document;  // read-doc
    if (readoc.getElementById('viewImages'))
      return;  // 已经加过了
    const scr: HTMLScriptElement = readoc.createElement('script');
    // scr.src = this._Addon.rootURI + 'chrome/content/allImages/reader.js';
    scr.innerHTML = Zotero.File.getContentsFromURL(
      'chrome://chartero/content/allImages/reader.js'
    );
    this._debug(scr);
    readoc.head.appendChild(scr);
  }

}

export default AddonEvents;
