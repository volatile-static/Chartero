import { BasicTool } from "zotero-plugin-toolkit";

const basicTool = new BasicTool();
export const G = basicTool.getGlobal;
export const React = G('React');
export const ReactDOM: ReactDOM = G('ReactDOM');
