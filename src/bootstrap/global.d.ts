declare const addon: import('./addon').default;
declare const rootURI: string;
declare const __dev__: boolean;

declare type ReactDOM = typeof import('react-dom');
declare class ChromeWorker extends Worker { }
declare module '*.sass';
declare module '*.svg';

declare type MaybeArray<T> = T | T[];

declare interface MainWindow extends Window {
    Zotero_Tabs: typeof Zotero_Tabs;
    ZoteroPane_Local: typeof ZoteroPane;
}
