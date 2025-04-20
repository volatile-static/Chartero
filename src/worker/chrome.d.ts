declare const IOUtils: {
    read(path: string): Promise<Uint8Array>;
    write(path: string, data: Uint8Array): void;
}

declare module 'resource://zotero/reader/pdf/build/pdf.mjs' {
    export * from 'node_modules/pdfjs-dist/types/src/pdf.d.ts';
}
