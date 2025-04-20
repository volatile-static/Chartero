/// <reference types="zotero-types/entries/sandbox/index.d.ts" />

declare const addon: import('./addon').default;
declare const rootURI: string;
declare const __dev__: boolean;

declare type ReactDOM = typeof import('react-dom');
declare module '*.sass';
declare module '*.svg';

declare type MaybeArray<T> = T | T[];
