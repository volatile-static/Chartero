declare const IOUtils: {
    read(path: string): Promise<Uint8Array>;
}

declare const pdfjsLib: typeof import('node_modules/pdfjs-dist/types/src/pdf.d.ts');
