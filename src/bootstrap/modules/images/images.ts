import type { TagElementProps } from 'zotero-plugin-toolkit';
import { ClipboardHelper } from 'zotero-plugin-toolkit';
import { isPDFReader, isEpubReader, isWebReader, PdfImageListener } from '../utils';
import { React, ReactDOM } from '../global';
import View, { type LoadedPages } from './components';
import stylesheet from './images.sass';
import icon from './viewImages.svg';

/**
 * 给阅读器左侧边栏添加图片预览
 */
export default async function addImagesPanelForReader(reader: _ZoteroTypes.ReaderInstance) {
    switch (true) {
        case isPDFReader(reader):
            new PDFImages(reader);
            break; // PDFViewerApplication.eventBus?.on('pagechanging'
        case isEpubReader(reader):
            new EPUBImages(reader);
            break;
        case isWebReader(reader):
            new SnapshotImages(reader);
            break;
        default:
            addon.log('Unknown reader type:', reader);
            break;
    }
}

abstract class ReaderImages<T extends keyof _ZoteroTypes.Reader.ViewTypeMap> {
    protected readonly doc: Document;
    protected readonly primaryView: _ZoteroTypes.Reader.ViewTypeMap[T];
    protected readonly imagesView: HTMLDivElement;
    protected readonly viewImages: HTMLButtonElement;
    protected popMsg: Zotero.ProgressWindow;
    protected progMeter: typeof Zotero.ProgressWindow.ItemProgress;
    protected loadedImages = 0;

    constructor(protected readonly reader: _ZoteroTypes.ReaderInstance<T>) {
        this.doc = reader._iframeWindow!.document;
        this.primaryView = reader._primaryView as _ZoteroTypes.Reader.ViewTypeMap[T];

        const sidebarCont = this.doc.getElementById('sidebarContent'),
            btnCont = this.doc.querySelector('#sidebarContainer .start')!;

        this.viewImages = addon.ui.appendElement(
            {
                tag: 'button',
                namespace: 'html',
                id: 'viewImages',
                classList: ['toolbar-button'],
                attributes: {
                    title: addon.locale.images.allImages,
                    tabindex: '-1',
                },
                properties: {
                    innerHTML: icon,
                },
            },
            btnCont,
        ) as HTMLButtonElement;
        this.imagesView = addon.ui.appendElement(
            {
                tag: 'div',
                id: 'imagesView',
                classList: ['hidden'],
            },
            sidebarCont!,
        ) as HTMLDivElement;

        // 注入CSS样式
        addon.ui.appendElement(
            {
                tag: 'style',
                namespace: 'html',
                properties: { textContent: stylesheet },
                skipIfExists: true,
            },
            this.doc.head,
        );

        // 标签按钮切换的额外操作
        addon.registerListener(btnCont, 'click', e => {
            addon.log(e);
            if ((e.target as Element).tagName == 'DIV') return;
            const b = (e.target as Element).closest('button')!;
            if (b.id == 'viewImages') {
                reader.setSidebarView('chartero');
                this.viewImages.classList.toggle('active', true);
                this.imagesView.classList.toggle('hidden', false);
                if (!this.loadedImages) this.loadAll(); // 初始化
            } else {
                b.ownerDocument.getElementById('viewImages')?.classList.toggle('active', false);
                b.ownerDocument.getElementById('imagesView')?.classList.toggle('hidden', true);
                addon.log('hide images');
            }
        });
    }

    protected abstract loadAllImages(): Promise<void>;

    private async loadAll() {
        this.viewImages.setAttribute('disabled', '1');

        // 初始化右下角弹窗
        this.popMsg = new Zotero.ProgressWindow();
        this.popMsg.changeHeadline('', 'chrome://chartero/content/icons/icon.svg', 'Chartero');
        this.popMsg.addDescription('‾‾‾‾‾‾‾‾‾‾‾‾');
        this.progMeter = new this.popMsg.ItemProgress(
            'chrome://chartero/content/icons/accept.png',
            addon.locale.images.loadingImages,
        );
        this.popMsg.show();

        await this.loadAllImages().catch(addon.log.bind(addon));

        this.updateProgress(100);
        this.viewImages.removeAttribute('disabled');
    }

    protected abstract updateProgress(percentage: number): void;
}

class PDFImages extends ReaderImages<'pdf'> {
    private readonly loadedPages: LoadedPages = {};

    private onRenderImage: PdfImageListener = (pageNum, imgNum, { rect, pageIdx, data }) => {
        this.loadedPages[pageIdx] ??= { numImages: imgNum, loadedImages: [] };
        this.loadedPages[pageIdx].loadedImages.push({ rect, data });
        if (__dev__)
            addon.getGlobal('console').time('render' + pageNum + '-' + imgNum);
        try {
            const view = React.createElement(View, {
                pages: this.loadedPages,
                onNavigate: position => this.reader.navigate({ position }),
            });
            ReactDOM.render(view, this.imagesView);
        } catch (error) {
            addon.log(error);
        }
        if (__dev__)
            addon.getGlobal('console').timeEnd('render' + pageNum + '-' + imgNum);
        ++this.loadedImages;
    };

    async loadAllImages() {
        const viewerApp = this.primaryView._iframeWindow!.PDFViewerApplication,
            dat = (await (this.reader as any)._getData()) as { url: string };
        await viewerApp.pdfLoadingTask?.promise;
        await viewerApp.pdfViewer?.pagesPromise;
        addon.worker.subscribePDF(dat.url, this.onRenderImage.bind(this));
        await addon.worker.query('getAllImages', dat.url);
    }

    protected updateProgress(percentage: number, page: number = 0) {
        if (percentage >= 100) {
            this.progMeter.setProgress(100);
            this.progMeter.setText(addon.locale.images.imagesLoaded);
            this.popMsg.startCloseTimer(2333);
        } else {
            this.progMeter.setProgress(percentage);
            this.progMeter.setText('Scanning images in page ' + page);
        }
    }
}

abstract class DOMImages<DOMImageElement extends SVGImageElement | HTMLImageElement> extends ReaderImages<
    'epub' | 'snapshot'
> {
    protected readonly imageLinks = new Array<DOMImageElement>();
    protected abstract readonly imageSelector: string;

    async loadAllImages() {
        const doc = (this.primaryView as any)._iframeDocument as Document,
            imgList: NodeListOf<DOMImageElement> = doc.querySelectorAll(this.imageSelector);
        Array.prototype.forEach.call(imgList, (img: DOMImageElement) => {
            const url = img instanceof window.SVGImageElement ? img.href.baseVal : img.src;
            addon.ui.appendElement(this.renderImage(url), this.imagesView);
            this.imageLinks.push(img);
        });
    }

    protected renderImage(url: string): TagElementProps {
        ++this.loadedImages;
        return {
            tag: 'img',
            id: 'chartero-allImages-' + this.loadedImages,
            attributes: {
                src: url,
                title: addon.locale.images.dblClickToCopy,
            },
            classList: ['previewImg'],
            listeners: [
                { type: 'click', listener: this.onImageClick.bind(this) },
                { type: 'dblclick', listener: this.onImageDblClick },
            ],
        };
    }

    protected onImageClick(e: MouseEvent): void {
        const idx = (e.target as HTMLImageElement).id.split('-').at(-1);
        if (idx) this.imageLinks[parseInt(idx)].scrollIntoView({ behavior: 'smooth' });
        else addon.log('No image to scroll.');
    }

    protected onImageDblClick(this: HTMLImageElement) {
        addon.log(this);
        const canvas = this.ownerDocument.createElement('canvas');
        canvas.width = this.naturalWidth;
        canvas.height = this.naturalHeight;
        canvas.getContext('2d')?.drawImage(this, 0, 0);
        new ClipboardHelper().addImage(canvas.toDataURL()).copy();
    }

    protected updateProgress(): void {
        this.progMeter.setProgress(100);
        this.progMeter.setText(addon.locale.images.imagesLoaded);
        this.popMsg.startCloseTimer(2333);
    }
}

class EPUBImages extends DOMImages<SVGImageElement> {
    protected readonly imageSelector = 'svg image';
}

class SnapshotImages extends DOMImages<HTMLImageElement> {
    protected readonly imageSelector = 'img';

    protected onImageDblClick(this: HTMLImageElement) {
        new ClipboardHelper().addImage(this.src).copy();
    }
}
