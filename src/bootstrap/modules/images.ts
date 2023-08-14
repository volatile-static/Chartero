

export default async function addImagesPanelForReader(reader: _ZoteroTypes.ReaderInstance) {
    await waitForReader(reader);

    const doc = reader._iframeWindow!.document,
        lastView = reader._lastView,
        win = lastView._iframeWindow,
        btnAnnotations = doc.querySelector('#toolbarSidebar #viewAnnotations'),
        sidebarCont = doc.getElementById('sidebarContent'),
        toolButtons = doc.getElementById('toolbarSidebar')!.getElementsByTagName('button'),
        imagesView = addon.ui.appendElement({
            tag: 'div',
            id: 'imagesView',
            classList: ['hidden']
        }, sidebarCont!),
        viewImages = addon.ui.insertElementBefore({
            tag: 'button',
            namespace: 'html',
            id: 'viewImages',
            classList: ['toolbarButton'],
            attributes: {
                title: 'All Images',
                tabindex: '-1',
                disabled: 'true'
            }
        }, btnAnnotations!);
    addon.ui.appendElement({
        tag: 'style',
        properties: {
            innerHTML: Zotero.File.getContentsFromURL(rootURI + 'content/images.css')
        }
    }, doc.head);

    // 标签按钮切换的额外操作
    for (const btn of toolButtons)
        btn.onclick = function (this: HTMLButtonElement) {
            if (this.id == 'viewImages') {
                win.PDFViewerApplication.pdfSidebar.active = 6;
                for (const b of toolButtons)
                    b.classList.toggle('toggled', false);
                for (const v of sidebarCont!.children)
                    v.classList.toggle('hidden', true);
                this.classList.toggle('toggled', true);
                imagesView.classList.toggle('hidden', false);
            } else {
                viewImages?.classList.toggle('toggled', false);
                imagesView.classList.toggle('hidden', true);
            }
        };

    await win.PDFViewerApplication.pdfLoadingTask.promise;
    await win.PDFViewerApplication.pdfViewer.pagesPromise;

    const pages: any[] = win.PDFViewerApplication.pdfViewer._pages,
        imgs = new Array();
    // 获取所有图片
    for (const page of pages) {
        const opts = await page.pdfPage.getOperatorList(),
            objs = page.pdfPage.objs;
        for (let i = 0; i < opts.fnArray.length; ++i)
            if (opts.fnArray[i] == win.pdfjsLib.OPS.paintImageXObject)
                imgs.push(objs.get(opts.argsArray[i][0]));
    }
    // 渲染图片到侧边栏
    for (const img of imgs) {
        // 必须在同一个window下才能绘制！
        const canvas = lastView._iframeWindow!.document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        try {
            putBinaryImageData(canvas.getContext('2d')!, img);
        } catch (error) {
            addon.log(error);
            continue;
        }
        imagesView.appendChild(canvas);
    }
    viewImages!.removeAttribute('disabled');
}

async function waitForReader(reader: _ZoteroTypes.ReaderInstance) {
    for (let i = 0; i < 500; ++i)
        if (reader._internalReader && reader._lastView?._iframeWindow)
            return true;
        else
            await Zotero.Promise.delay(20);
    throw new Error('Reader not found');
}

/**
 * https://stackoverflow.com/questions/40378990
 * @param ctx 
 * @param imgData 
 * @param transferMaps 
 */
function putBinaryImageData(ctx: CanvasRenderingContext2D, imgData: ImageData) {
    const FULL_CHUNK_HEIGHT = 16;

    const ImageKind = {
        GRAYSCALE_1BPP: 1,
        RGB_24BPP: 2,
        RGBA_32BPP: 3
    };

    if (typeof ImageData !== "undefined" && imgData instanceof ImageData) {
        ctx.putImageData(imgData, 0, 0);
        return;
    }

    const height = imgData.height,
        width = imgData.width;
    const partialChunkHeight = height % FULL_CHUNK_HEIGHT;
    const fullChunks = (height - partialChunkHeight) / FULL_CHUNK_HEIGHT;
    const totalChunks = partialChunkHeight === 0 ? fullChunks : fullChunks + 1;
    const chunkImgData = ctx.createImageData(width, FULL_CHUNK_HEIGHT);
    let srcPos = 0,
        destPos;
    const src = imgData.data;
    const dest = chunkImgData.data;
    // @ts-expect-error
    const imgDataKind = imgData.kind;
    let i, j, thisChunkHeight, elemsInThisChunk;
    let transferMapRed, transferMapGreen, transferMapBlue, transferMapGray;

    if (imgDataKind === ImageKind.GRAYSCALE_1BPP) {
        addon.log('GRAYSCALE_1BPP');
        const srcLength = src.byteLength;
        const dest32 = new Uint32Array(dest.buffer, 0, dest.byteLength >> 2);
        const dest32DataLength = dest32.length;
        const fullSrcDiff = width + 7 >> 3;
        let white = 0xffffffff;
        // @ts-expect-error
        let black = _util.IsLittleEndianCached.value ? 0xff000000 : 0x000000ff;

        if (transferMapGray) {
            if (transferMapGray[0] === 0xff && transferMapGray[0xff] === 0) {
                [white, black] = [black, white];
            }
        }

        for (i = 0; i < totalChunks; i++) {
            thisChunkHeight = i < fullChunks ? FULL_CHUNK_HEIGHT : partialChunkHeight;
            destPos = 0;

            for (j = 0; j < thisChunkHeight; j++) {
                const srcDiff = srcLength - srcPos;
                let k = 0;
                const kEnd = srcDiff > fullSrcDiff ? width : srcDiff * 8 - 7;
                const kEndUnrolled = kEnd & ~7;
                let mask = 0;
                let srcByte = 0;

                for (; k < kEndUnrolled; k += 8) {
                    srcByte = src[srcPos++];
                    dest32[destPos++] = srcByte & 128 ? white : black;
                    dest32[destPos++] = srcByte & 64 ? white : black;
                    dest32[destPos++] = srcByte & 32 ? white : black;
                    dest32[destPos++] = srcByte & 16 ? white : black;
                    dest32[destPos++] = srcByte & 8 ? white : black;
                    dest32[destPos++] = srcByte & 4 ? white : black;
                    dest32[destPos++] = srcByte & 2 ? white : black;
                    dest32[destPos++] = srcByte & 1 ? white : black;
                }

                for (; k < kEnd; k++) {
                    if (mask === 0) {
                        srcByte = src[srcPos++];
                        mask = 128;
                    }

                    dest32[destPos++] = srcByte & mask ? white : black;
                    mask >>= 1;
                }
            }

            while (destPos < dest32DataLength) {
                dest32[destPos++] = 0;
            }

            ctx.putImageData(chunkImgData, 0, i * FULL_CHUNK_HEIGHT);
        }
    } else if (imgDataKind === ImageKind.RGBA_32BPP) {
        j = 0;
        elemsInThisChunk = width * FULL_CHUNK_HEIGHT * 4;

        for (i = 0; i < fullChunks; i++) {
            dest.set(src.subarray(srcPos, srcPos + elemsInThisChunk));
            srcPos += elemsInThisChunk;

            ctx.putImageData(chunkImgData, 0, j);
            j += FULL_CHUNK_HEIGHT;
        }

        if (i < totalChunks) {
            elemsInThisChunk = width * partialChunkHeight * 4;
            dest.set(src.subarray(srcPos, srcPos + elemsInThisChunk));
            ctx.putImageData(chunkImgData, 0, j);
        }
    } else if (imgDataKind === ImageKind.RGB_24BPP) {
        thisChunkHeight = FULL_CHUNK_HEIGHT;
        elemsInThisChunk = width * thisChunkHeight;

        for (i = 0; i < totalChunks; i++) {
            if (i >= fullChunks) {
                thisChunkHeight = partialChunkHeight;
                elemsInThisChunk = width * thisChunkHeight;
            }

            destPos = 0;

            for (j = elemsInThisChunk; j--;) {
                dest[destPos++] = src[srcPos++];
                dest[destPos++] = src[srcPos++];
                dest[destPos++] = src[srcPos++];
                dest[destPos++] = 255;
            }

            ctx.putImageData(chunkImgData, 0, i * FULL_CHUNK_HEIGHT);
        }
    } else {
        throw new Error(`bad image kind: ${imgDataKind}`);
    }
}
