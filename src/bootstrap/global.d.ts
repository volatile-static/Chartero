declare const addon: import('./addon').default;
declare const rootURI: string;
declare const __dev__: boolean;

declare type PrefsKey = keyof typeof import('../../package.json').config.defaultSettings;
declare type ReactDOM = typeof import('react-dom');
declare module '*.css';

declare type MaybeArray<T> = T | T[];
