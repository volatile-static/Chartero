import type { PDFThumbnailViewer } from 'pdfjs-dist/types/web/pdf_thumbnail_viewer';
import type { PDFThumbnailView } from 'pdfjs-dist/types/web/pdf_thumbnail_view';
import type { PDFLinkService, PDFViewer } from 'pdfjs-dist/web/pdf_viewer';
import type { PDFDocumentProxy, PDFDocumentLoadingTask } from 'pdfjs-dist';

export default async function renderMinimap(
    reader: _ZoteroTypes.ReaderInstance
) {
    const win: Window = (reader._primaryView as _ZoteroTypes.Reader.PDFView)._iframeWindow!,
        app: PDFViewerApplication = (win as any).PDFViewerApplication,
        doc = reader._iframeWindow!.document,
        outerContainer = doc.getElementById('primary-view'),
        history = addon.history.getByAttachment(reader.itemID!),
        numPages = reader._state.primaryViewStats.pagesCount!;
    if (!history || !outerContainer) return;

    addon.ui.appendElement(
        {
            tag: 'style',
            namespace: 'html',
            properties: {
                innerHTML: Zotero.File.getContentsFromURL(rootURI + 'content/minimap.css')
            },
            skipIfExists: true,
        },
        doc.head
    );

    const container = addon.ui.appendElement(
        { tag: 'div', classList: ['chartero-minimap-container'] },
        outerContainer
    ),
        seconds = history.record.pageArr.map(p => p.totalS),
        maxSeconds = seconds.reduce((a, b) => Math.max(a ?? 0, b ?? 0), 0);

    if (!maxSeconds) return;

    for (let i = 0; i < numPages; ++i) {
        addon.ui.appendElement(
            {
                tag: 'div',
                styles: {
                    height: 100 / numPages + '%',
                    opacity: String(
                        (history.record.pages[i]?.totalS ?? 0) / maxSeconds
                    ),
                },
                classList: ['chartero-minimap-page'],
            },
            container
        );
    }
}

interface PDFViewerApplication {
    pdfViewer: PDFViewer;
    pdfThumbnailViewer: PDFThumbnailViewer;
    pdfDocument: PDFDocumentProxy;
    pdfLinkService: PDFLinkService;
    pdfLoadingTask: PDFDocumentLoadingTask;
    page: number;
    pagesCount: number;
    initializedPromise: Promise<void>;
}
