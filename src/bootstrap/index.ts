import Addon from "./addon";

// @ts-expect-error assign
addon = new Addon();

// 开发环境下暴露到全局变量
if (__dev__)
    (Zotero as any).Chartero = addon;
