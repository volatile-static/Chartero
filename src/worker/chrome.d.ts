declare const IOUtils: {
    read(path: string): Promise<Uint8Array>;
    write(path: string, data: Uint8Array): void;
}

declare const pdfjsLib: typeof import('node_modules/pdfjs-dist/types/src/pdf.d.ts');
