import { BasicTool } from "zotero-plugin-toolkit/dist/basic";

const basicTool = new BasicTool();
export const G = basicTool.getGlobal;
export const React = G('React');
export const ReactDOM: ReactDOM = G('ReactDOM');
