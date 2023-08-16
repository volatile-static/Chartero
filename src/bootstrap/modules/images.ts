import { ClipboardHelper } from "zotero-plugin-toolkit/dist/helpers/clipboard";
import type { TagElementProps } from "zotero-plugin-toolkit/dist/tools/ui";

/**
 * 给阅读器左侧边栏添加图片预览
 */
export default async function addImagesPanelForReader(reader: _ZoteroTypes.ReaderInstance) {
    await waitForReader(reader);
    switch (reader.type) {
        case 'pdf': new PDFImages(reader); break;
        case 'epub': new EPUBImages(reader); break;
        case 'snapshot': new SnapshotImages(reader); break;
        default: break;
    }
}

async function waitForReader(reader: _ZoteroTypes.ReaderInstance) {
    for (let i = 0; i < 500; ++i)
        if (reader._internalReader && reader._lastView?._iframeWindow)
            return true;
        else
            await Zotero.Promise.delay(20);
    throw new Error('Reader not found');
}

function ProgressMeter() {
    const popMsg = new Zotero.ProgressWindow(),
        locale = addon.locale.imagesLoaded;
    popMsg.changeHeadline(
        '',
        'chrome://chartero/content/icons/icon.png',
        'Chartero'
    );
    popMsg.addDescription('‾‾‾‾‾‾‾‾‾‾‾‾');
    let prog = new popMsg.ItemProgress(
        'chrome://chartero/content/icons/accept.png',
        addon.locale.loadingImages
    );
    popMsg.show();
    return function (percentage: number, page: number = 0) {
        if (percentage >= 100) {
            prog.setProgress(100);
            prog.setText(locale);
            popMsg.startCloseTimer(2333, true);
        } else {
            prog.setProgress(percentage);
            prog.setText('Scanning images in page ' + page);
        }
    };
}

abstract class ReaderImages {
    protected readonly doc: Document;
    protected readonly primaryView: _ZoteroTypes.Reader.PDFView | _ZoteroTypes.Reader.EPUBView | _ZoteroTypes.Reader.SnapshotView;
    protected readonly imagesView: HTMLDivElement;
    protected readonly viewImages: HTMLButtonElement;
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
                title: 'All Images',
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
            }
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

    protected abstract loadMoreImages(setProgress: ReturnType<typeof ProgressMeter>): Promise<void>;
    protected abstract onImageClick(e: MouseEvent): void;

    protected async loadAllImages() {
        this.viewImages.setAttribute('disabled', '1');
        const setProgress = ProgressMeter();

        await this.loadMoreImages(setProgress);

        setProgress(100);
        this.viewImages.removeAttribute('disabled');
    }

    protected renderImage(url: string, idx?: number): TagElementProps {
        ++this.loadedImages;
        return {
            tag: 'img',
            id: idx ? 'chartero-allImages-' + idx : undefined,
            attributes: {
                src: url,
                title: '双击复制图片'
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
            properties: { innerHTML: 'Load More...' },
            listeners: [{ type: 'click', listener: this.loadAllImages.bind(this) }]
        }, this.imagesView) as HTMLButtonElement;
    }

    async loadMoreImages(setProgress: ReturnType<typeof ProgressMeter>) {
        this.btnLoadMore.style.display = 'none';
        const win = this.primaryView._iframeWindow,
            viewerApp = win.PDFViewerApplication;

        await viewerApp.pdfLoadingTask.promise;
        await viewerApp.pdfViewer.pagesPromise;
        for (
            let i = 0;
            i < 10 && this.loadedPages < viewerApp.pdfDocument.numPages;
            ++this.loadedPages
        ) {
            setProgress(i * 10, this.loadedPages);
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
    }

    protected onImageClick(this: ReaderImages, e: MouseEvent) {
        addon.log(e);
    }
}

class EPUBImages extends ReaderImages {
    private readonly imageLinks = new Array<SVGImageElement>();

    async loadMoreImages(setProgress: ReturnType<typeof ProgressMeter>) {
        const doc = this.primaryView._iframeDocument as Document,
            imgList: NodeListOf<SVGImageElement> = doc.querySelectorAll('svg image');
        for (let i = 0; i < imgList.length; ++i) {
            setProgress(i / imgList.length * 100);
            addon.ui.appendElement(this.renderImage(imgList[i].href.baseVal, i), this.imagesView);
            this.imageLinks.push(imgList[i]);
        }
    }

    protected onImageClick(e: MouseEvent): void {
        const idx = (e.target as HTMLImageElement).id.split('-').at(-1);
        if (idx)
            this.imageLinks[parseInt(idx)].scrollIntoView({ behavior: 'smooth' });
        else
            addon.log('No image to scroll.');
    }
}

class SnapshotImages extends ReaderImages {
    private readonly imageLinks = new Array<HTMLImageElement>();

    async loadMoreImages(setProgress: ReturnType<typeof ProgressMeter>) {
        const doc = this.primaryView._iframeDocument as Document,
            imgList: NodeListOf<HTMLImageElement> = doc.querySelectorAll('img');
        for (let i = 0; i < imgList.length; ++i) {
            setProgress(i / imgList.length * 100);
            addon.ui.appendElement(this.renderImage(imgList[i].src, i), this.imagesView);
            this.imageLinks.push(imgList[i]);
        }
    }

    protected onImageDblClick(this: HTMLImageElement) {
        new ClipboardHelper().addImage(this.src).copy();
    }

    protected onImageClick(e: MouseEvent): void {
        const idx = (e.target as HTMLImageElement).id.split('-').at(-1);
        if (idx)
            this.imageLinks[parseInt(idx)].scrollIntoView({ behavior: 'smooth' });
        else
            addon.log('No image to scroll.');
    }
}
