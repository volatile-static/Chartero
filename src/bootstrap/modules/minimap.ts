import type { PDFThumbnailViewer } from 'pdfjs-dist/types/web/pdf_thumbnail_viewer';
import type { PDFThumbnailView } from 'pdfjs-dist/types/web/pdf_thumbnail_view';
import type { PDFLinkService, PDFViewer } from 'pdfjs-dist/web/pdf_viewer';
import type { PDFDocumentProxy, PDFDocumentLoadingTask } from 'pdfjs-dist';

export default async function renderMinimap(
    reader: _ZoteroTypes.ReaderInstance
) {
    const win: Window = (reader._iframeWindow as any).wrappedJSObject,
        app: PDFViewerApplication = (win as any).PDFViewerApplication,
        doc = win.document,
        outerContainer = doc.getElementById('outerContainer'),
        history = toolkit.history.getByAttachment(reader.itemID!);
    if (!history || !outerContainer) return;

    toolkit.ui.appendElement(
        {
            tag: 'style',
            namespace: 'html',
            properties: {
                innerHTML: `
                    .chartero-minimap-container {
                        position: absolute;
                        top: 32px;
                        right: 0;
                        display: block;
                        width: 8px;
                        height: calc(100% - 32px);
                        opacity: 0.8;
                        transition: all 0.2s ease-in-out;
                        pointer-events: none;
                    }

                    .chartero-minimap-container:hover {
                        opacity: 0.6;
                        width: 12px;
                    }

                    .chartero-minimap-page {
                        display: block;
                        width: 100%;
                        background-color: lime;
                    }
                `,
            },
            skipIfExists: true,
        },
        doc.head
    );

    const container = toolkit.ui.appendElement(
            { tag: 'div', classList: ['chartero-minimap-container'] },
            outerContainer
        ),
        seconds = history.record.pageArr.map(p => p.totalS),
        maxSeconds = seconds.reduce((a, b) => Math.max(a ?? 0, b ?? 0), 0);

    if (!maxSeconds) return;
    toolkit.log('waiting for ', app.pagesCount);
    while (!app.pagesCount) await Zotero.Promise.delay(1000);
    toolkit.log('got ', app.pagesCount);

    for (let i = 0; i < app.pagesCount; ++i) {
        toolkit.ui.appendElement(
            {
                tag: 'div',
                styles: {
                    height: 100 / app.pagesCount + '%',
                    //@ts-expect-error
                    opacity:
                        (history.record.pages[i]?.totalS ?? 0) / maxSeconds,
                },
                classList: ['chartero-minimap-page'],
            },
            container
        );
    }

    // thumbnails: PDFThumbnailView[] = app.pdfThumbnailViewer._thumbnails!;
    // await waitFor(() => thumbnails.length > 0);
    // const imagePromises = thumbnails.map(async thumbnail => {
    //     await waitFor(() => typeof thumbnail.image != 'undefined');
    //     toolkit.log(thumbnail.image!.getAttribute('src'));
    //     return thumbnail.image;
    // });
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
