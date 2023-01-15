import { Addon, CharteroToolkit } from "./addon";

if (!Zotero.Chartero) {
  //@ts-ignore
  toolkit = new CharteroToolkit();
  try {
    //@ts-ignore
    localeStr = JSON.parse(
      Zotero.File.getContentsFromURL('chrome://chartero/locale/chartero.json')
    );
  } catch (error) {
    toolkit.log('Locale load failed:', error);
  }
  Zotero.Chartero = new Addon();
}
