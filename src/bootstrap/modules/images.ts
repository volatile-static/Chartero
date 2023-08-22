import { ClipboardHelper } from "zotero-plugin-toolkit/dist/helpers/clipboard";
import type { TagElementProps } from "zotero-plugin-toolkit/dist/tools/ui";
import { waitForReader } from "./utils";

/**
 * 给阅读器左侧边栏添加图片预览
 */
export default async function addImagesPanelForReader(reader: _ZoteroTypes.ReaderInstance) {
    switch (reader.type) {
        case 'pdf': new PDFImages(reader); break;
        case 'epub': new EPUBImages(reader); break;
        case 'snapshot': new SnapshotImages(reader); break;
        default: break;
    }
}

abstract class ReaderImages {
    protected readonly doc: Document;
    protected readonly primaryView: _ZoteroTypes.Reader.PDFView | _ZoteroTypes.Reader.EPUBView | _ZoteroTypes.Reader.SnapshotView;
    protected readonly imagesView: HTMLDivElement;
    protected readonly viewImages: HTMLButtonElement;
    protected popMsg: Zotero.ProgressWindow;
    protected progMeter: typeof Zotero.ProgressWindow.ItemProgress;
    protected loadedImages = 0;

    constructor(reader: _ZoteroTypes.ReaderInstance) {
        this.doc = reader._iframeWindow!.document;
        this.primaryView = reader._primaryView;

        const btnAnnotations = this.doc.querySelector('#toolbarSidebar #viewAnnotations'),
            sidebarCont = this.doc.getElementById('sidebarContent'),
            toolButtons = this.doc.getElementById('toolbarSidebar')!.getElementsByTagName('button');

        this.viewImages = addon.ui.insertElementBefore({
            tag: 'button',
            namespace: 'html',
            id: 'viewImages',
            classList: ['toolbarButton'],
            attributes: {
                title: addon.locale.images.allImages,
                tabindex: '-1'
            },
            children: [{ tag: 'span' }]  // 背景
        }, btnAnnotations!) as HTMLButtonElement;
        this.imagesView = addon.ui.appendElement({
            tag: 'div',
            id: 'imagesView',
            classList: ['hidden']
        }, sidebarCont!) as HTMLDivElement;

        // 注入CSS样式
        addon.ui.appendElement({
            tag: 'style',
            namespace: 'html',
            properties: {
                innerHTML: Zotero.File.getContentsFromURL(rootURI + 'content/images.css')
            },
            skipIfExists: true,
        }, this.doc.head);

        // 标签按钮切换的额外操作
        for (const btn of toolButtons)
            btn.onclick = (e: MouseEvent) => {
                if ((e.target as HTMLButtonElement).id == 'viewImages') {
                    reader.setSidebarView('chartero');
                    this.viewImages.classList.toggle('toggled', true);
                    this.imagesView.classList.toggle('hidden', false);
                    if (!this.loadedImages)
                        this.loadAllImages();
                } else {
                    this.viewImages.classList.toggle('toggled', false);
                    this.imagesView.classList.toggle('hidden', true);
                }
            };
    }

    protected abstract loadMoreImages(): Promise<void>;
    protected abstract onImageClick(e: MouseEvent): void;

    protected async loadAllImages() {
        this.viewImages.setAttribute('disabled', '1');

        // 初始化右下角弹窗
        this.popMsg = new Zotero.ProgressWindow();
        this.popMsg.changeHeadline(
            '',
            'chrome://chartero/content/icons/icon.png',
            'Chartero'
        );
        this.popMsg.addDescription('‾‾‾‾‾‾‾‾‾‾‾‾');
        this.progMeter = new this.popMsg.ItemProgress(
            'chrome://chartero/content/icons/accept.png',
            addon.locale.images.loadingImages
        );
        this.popMsg.show();

        await this.loadMoreImages();

        this.updateProgress(100);
        this.viewImages.removeAttribute('disabled');
    }

    protected renderImage(url: string, idx?: number): TagElementProps {
        ++this.loadedImages;
        return {
            tag: 'img',
            id: idx ? 'chartero-allImages-' + idx : undefined,
            attributes: {
                src: url,
                title: addon.locale.images.dblClickToCopy
            },
            classList: ['previewImg'],
            listeners: [
                { type: 'click', listener: this.onImageClick.bind(this) },
                { type: 'dblclick', listener: this.onImageDblClick }
            ]
        }
    }

    protected onImageDblClick(this: HTMLImageElement) {
        addon.log(this);
        const canvas = this.ownerDocument.createElement('canvas');
        canvas.width = this.naturalWidth;
        canvas.height = this.naturalHeight;
        canvas.getContext('2d')?.drawImage(this, 0, 0);
        new ClipboardHelper().addImage(canvas.toDataURL()).copy();
    }

    protected abstract updateProgress(percentage: number): void;
}

class PDFImages extends ReaderImages {
    private readonly btnLoadMore: HTMLButtonElement;
    private loadedPages = 0;

    constructor(reader: _ZoteroTypes.ReaderInstance) {
        super(reader);
        this.btnLoadMore = addon.ui.appendElement({
            tag: 'button',
            namespace: 'html',
            id: 'btnLoadMore',
            properties: { innerHTML: addon.locale.images.loadMore },
            listeners: [{ type: 'click', listener: this.loadAllImages.bind(this) }]
        }, this.imagesView) as HTMLButtonElement;
    }

    async loadMoreImages() {
        this.btnLoadMore.classList.toggle('hidden', true);
        const win = (this.primaryView as _ZoteroTypes.Reader.PDFView)._iframeWindow!,
            viewerApp = win.PDFViewerApplication;

        await viewerApp.pdfLoadingTask.promise;
        await viewerApp.pdfViewer.pagesPromise;
        for (
            let i = 0;
            i < 10 && this.loadedPages < viewerApp.pdfDocument.numPages;
            ++this.loadedPages
        ) {
            this.updateProgress(i * 10, this.loadedPages);
            const pdfPage = viewerApp.pdfViewer._pages[this.loadedPages].pdfPage,
                opList = await pdfPage.getOperatorList(),
                svgGfx = new win.pdfjsLib.SVGGraphics(pdfPage.commonObjs, pdfPage.objs),
                // 页面转换为svg
                svg = await svgGfx.getSVG(opList, pdfPage.getViewport({ scale: 1 })),
                urlArr: string[] = Array.prototype.map.call(
                    svg.getElementsByTagName('svg:image'),
                    (i: SVGAElement) => i.getAttribute('xlink:href')
                );  // 获取所有图片的链接
            if (urlArr.length < 1 || urlArr.length > 60)  // 每页超过多少张图不显示
                continue;
            ++i;

            for (const url of urlArr)
                addon.ui.insertElementBefore(
                    this.renderImage(url),
                    this.btnLoadMore
                );
            addon.ui.insertElementBefore({
                tag: 'hr',
                classList: ['hr-text'],
                attributes: { 'data-content': pdfPage.pageNumber }
            }, this.btnLoadMore);
        }
        if (this.loadedPages < viewerApp.pdfDocument.numPages)
            this.btnLoadMore.classList.toggle('hidden', false);
    }

    protected onImageClick(this: ReaderImages, e: MouseEvent) {
        addon.log(e);
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

abstract class DOMImages<DOMImageElement extends (SVGImageElement | HTMLImageElement)> extends ReaderImages {
    protected readonly imageLinks = new Array<DOMImageElement>();
    protected readonly abstract imageSelector: string;

    async loadMoreImages() {
        const doc = (this.primaryView as any)._iframeDocument as Document,
            imgList: NodeListOf<DOMImageElement> = doc.querySelectorAll(this.imageSelector);
        Array.prototype.forEach.call(imgList, (img: DOMImageElement, idx: number) => {
            const url = img instanceof window.SVGImageElement ? img.href.baseVal : img.src;
            addon.ui.appendElement(this.renderImage(url, idx), this.imagesView);
            this.imageLinks.push(img);
        });
    }

    protected onImageClick(e: MouseEvent): void {
        const idx = (e.target as HTMLImageElement).id.split('-').at(-1);
        if (idx)
            this.imageLinks[parseInt(idx)].scrollIntoView({ behavior: 'smooth' });
        else
            addon.log('No image to scroll.');
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
