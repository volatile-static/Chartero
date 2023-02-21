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
        primaryView = doc.getElementById('viewerContainer'),
        secondView = doc.getElementById('secondView'),
        history = toolkit.history.getByAttachment(reader.itemID!);
    if (!primaryView || !secondView || !history) return;

    primaryView.style.display = 'flex';
    const container = toolkit.ui.appendElement(
            {
                tag: 'div',
                styles: {
                    display: 'block',
                    width: '12px',
                    height: '100%',
                    position: 'sticky',
                    top: '0px',
                    left: '0px',
                    'background-color': 'lightblue',
                },
            },
            primaryView
        ),
        seconds = history.record.pageArr.map(p => p.totalS),
        maxSeconds = seconds.reduce((a, b) => Math.max(a ?? 0, b ?? 0), 0);

    if (!maxSeconds) return;
    toolkit.log('waiting for ', reader._title);
    while (!app.pagesCount) await Zotero.Promise.delay(1000);
    toolkit.log('got ', reader._title);

    for (let i = 0; i < app.pagesCount; ++i) {
        toolkit.log(history.record.pages[i].totalS);
        toolkit.ui.appendElement(
            {
                tag: 'div',
                styles: {
                    display: 'block',
                    width: '100%',
                    height: 100 / app.pagesCount + '%',
                    //@ts-expect-error
                    opacity: (history.record.pages[i].totalS ?? 0) / maxSeconds,
                    transition: 'opacity 0.5s',
                    'background-color': 'red',
                },
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
