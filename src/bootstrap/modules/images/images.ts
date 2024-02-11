import type { TagElementProps } from "zotero-plugin-toolkit/dist/tools/ui";
import { ClipboardHelper } from "zotero-plugin-toolkit/dist/helpers/clipboard";
import { isPDFReader, isEpubReader, isWebReader, zip } from "../utils";
import stylesheet from "./images.sass";
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

abstract class ReaderImages<T extends keyof _ZoteroTypes.Reader.ViewTypeMap>{
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

        this.viewImages = addon.ui.appendElement({
            tag: 'button',
            namespace: 'html',
            id: 'viewImages',
            classList: ['toolbar-button'],
            attributes: {
                title: addon.locale.images.allImages,
                tabindex: '-1'
            },
            properties: {
                innerHTML: icon
            }
        }, btnCont) as HTMLButtonElement;
        this.imagesView = addon.ui.appendElement({
            tag: 'div',
            id: 'imagesView',
            classList: ['hidden']
        }, sidebarCont!) as HTMLDivElement;

        // 注入CSS样式
        addon.ui.appendElement({
            tag: 'style',
            namespace: 'html',
            properties: { textContent: stylesheet },
            skipIfExists: true,
        }, this.doc.head);

        // 标签按钮切换的额外操作
        addon.registerListener(btnCont, 'click', e => {
            addon.log(e);
            if ((e.target as Element).tagName == 'DIV')
                return;
            const b = (e.target as Element).closest('button')!;
            if (b.id == 'viewImages') {
                reader.setSidebarView('chartero');
                this.viewImages.classList.toggle('active', true);
                this.imagesView.classList.toggle('hidden', false);
                if (!this.loadedImages)
                    this.loadAllImages();
            } else {
                b.ownerDocument
                    .getElementById('viewImages')?.classList
                    .toggle('active', false);
                b.ownerDocument
                    .getElementById('imagesView')?.classList
                    .toggle('hidden', true);
                addon.log('hide images');
            }
        });
    }

    protected abstract loadMoreImages(): Promise<void>;
    protected abstract onImageClick(e: MouseEvent): void;

    protected async loadAllImages() {
        this.viewImages.setAttribute('disabled', '1');

        // 初始化右下角弹窗
        this.popMsg = new Zotero.ProgressWindow();
        this.popMsg.changeHeadline(
            '',
            'chrome://chartero/content/icons/icon.svg',
            'Chartero'
        );
        this.popMsg.addDescription('‾‾‾‾‾‾‾‾‾‾‾‾');
        this.progMeter = new this.popMsg.ItemProgress(
            'chrome://chartero/content/icons/accept.png',
            addon.locale.images.loadingImages
        );
        this.popMsg.show();

        await this.loadMoreImages().catch(addon.log.bind(addon));

        this.updateProgress(100);
        this.viewImages.removeAttribute('disabled');
    }

    protected renderImage(url: string): TagElementProps {
        ++this.loadedImages;
        return {
            tag: 'img',
            id: 'chartero-allImages-' + this.loadedImages,
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

class PDFImages extends ReaderImages<'pdf'> {
    private readonly btnLoadMore: HTMLButtonElement;
    private readonly positions = new Array<{
        pageIndex: number,
        rects: Array<[number, number, number, number]>
    }>();
    private loadedPages = 0;

    constructor(reader: _ZoteroTypes.ReaderInstance<'pdf'>) {
        super(reader);
        this.btnLoadMore = addon.ui.appendElement({
            tag: 'button',
            namespace: 'html',
            id: 'btnLoadMore',
            properties: { innerHTML: addon.locale.images.loadMore },
            listeners: [{ type: 'click', listener: this.loadAllImages.bind(this) }]
        }, this.imagesView) as HTMLButtonElement;
    }

    /**
     * 计算图片在页面中的位置
     */
    private calcRect(elm: SVGGElement): [number, number, number, number] {
        const childMatrix = elm.transform.baseVal.consolidate()!.matrix,
            parentMatrix = (elm.parentNode as SVGGElement).transform.baseVal.consolidate()!.matrix,
            width = Number(elm.attributes.getNamedItem('width')!.value.slice(0, -2)),
            height = Number(elm.attributes.getNamedItem('height')!.value.slice(0, -2)),
            tWidth = Math.abs(width * childMatrix.a * parentMatrix.a),
            tHeight = Math.abs(height * childMatrix.d * parentMatrix.d),
            bottom = childMatrix.f + parentMatrix.f,
            left = childMatrix.e + parentMatrix.e;
        window.console.table([childMatrix, parentMatrix]);
        // addon.log(left, top, right, bottom);
        return [left, bottom, left + tWidth, bottom + tHeight];
    }

    async loadMoreImages() {
        this.btnLoadMore.classList.toggle('hidden', true);
        const win = this.primaryView._iframeWindow!,
            viewerApp = win.PDFViewerApplication;

        await viewerApp.pdfLoadingTask?.promise;
        await viewerApp.pdfViewer?.pagesPromise;

        async function f1(page: _ZoteroTypes.Reader.PDFPageProxy) {
            const opList = await page.getOperatorList({
                annotationMode: win.pdfjsLib.AnnotationMode.DISABLE
            }),
                ops = zip(opList.fnArray, opList.argsArray),
                svgGfx = new win.pdfjsLib.SVGGraphics!(page.commonObjs, page.objs),
                result = win.document.createDocumentFragment();  // Restricted
            for (const [fn, args] of ops) {
                if (fn === win.pdfjsLib.OPS.paintImageXObject) {
                    const img = page.objs.get(args[0]);
                    svgGfx.paintInlineImageXObject(img, result);
                }
            }
            return Array.from(result.children);
        }
        async function f2(page: _ZoteroTypes.Reader.PDFPageProxy) {
            const opList = await page.getOperatorList(),
                svgGfx = new win.pdfjsLib.SVGGraphics!(page.commonObjs, page.objs),
                svg: unknown = await svgGfx.getSVG(opList, page.getViewport({ scale: 1 }));
            return Array.from((svg as SVGElement).getElementsByTagName('svg:image'));
        }

        for (
            let i = 0;
            i < 10 && this.loadedPages < viewerApp.pdfDocument!.numPages;
            ++this.loadedPages
        ) {
            this.updateProgress(i * 10, this.loadedPages);
            const pdfPage: _ZoteroTypes.Reader.PDFPageProxy =
                viewerApp.pdfViewer!._pages![this.loadedPages].pdfPage,
                imgArr = await f2(pdfPage),
                urlArr = imgArr.map(img => img.getAttribute('xlink:href'));  // 获取所有图片的链接
            if (urlArr.length < 1 || urlArr.length > 60)  // 每页超过多少张图不显示
                continue;
            ++i;
            this.positions.push(...imgArr.map(img => ({
                pageIndex: this.loadedPages,
                rects: [this.calcRect(img as SVGGElement)]
            })));

            for (const url of urlArr)
                addon.ui.insertElementBefore(
                    this.renderImage(url || ''),
                    this.btnLoadMore
                );
            addon.ui.insertElementBefore({
                tag: 'hr',
                classList: ['hr-text'],
                attributes: { 'data-content': pdfPage.pageNumber }
            }, this.btnLoadMore);
        }
        if (this.loadedPages < viewerApp.pdfDocument!.numPages)
            this.btnLoadMore.classList.toggle('hidden', false);
    }

    protected onImageClick(this: PDFImages, e: MouseEvent) {
        const idx = (e.target as HTMLImageElement).id.split('-').at(-1),
            pos = idx && this.positions[parseInt(idx) - 1];
        if (__dev__)
            addon.log(pos);
        pos && this.reader.navigate({ position: pos });
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

abstract class DOMImages<DOMImageElement extends (SVGImageElement | HTMLImageElement)> extends ReaderImages<'epub' | 'snapshot'>{
    protected readonly imageLinks = new Array<DOMImageElement>();
    protected readonly abstract imageSelector: string;

    async loadMoreImages() {
        const doc = (this.primaryView as any)._iframeDocument as Document,
            imgList: NodeListOf<DOMImageElement> = doc.querySelectorAll(this.imageSelector);
        Array.prototype.forEach.call(imgList, (img: DOMImageElement) => {
            const url = img instanceof window.SVGImageElement ? img.href.baseVal : img.src;
            addon.ui.appendElement(this.renderImage(url), this.imagesView);
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
