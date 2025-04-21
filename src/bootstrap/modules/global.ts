import { BasicTool } from "zotero-plugin-toolkit";

const basicTool = new BasicTool();
export const G = basicTool.getGlobal;
export const React = G('React');
export const createRoot: typeof import('react-dom/client').createRoot = G('ReactDOM').createRoot;
