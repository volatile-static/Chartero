import { Addon, CharteroToolkit } from "./addon";

if (!Zotero.Chartero) {
  //@ts-ignore
  toolkit = new CharteroToolkit();
  Zotero.Chartero = new Addon();
}
