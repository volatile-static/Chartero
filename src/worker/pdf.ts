import type { WorkerStream } from './manager';
import type { PDFDocumentProxy } from '../../node_modules/pdfjs-dist/types/src/pdf';
import * as pdfjsLib from 'resource://zotero/reader/pdf/build/pdf.mjs';

pdfjsLib.GlobalWorkerOptions.workerSrc = 'resource://zotero/reader/pdf/build/pdf.worker.mjs';
export { pdfjsLib };

export function processPDF(url: string) {
    return new Promise(resolve => processInPromise(url, resolve));
}

async function processInPromise(url: string, resolve: (value: string) => void) {
    const file = await IOUtils.read(url),
        worker = new Worker('chrome://zotero/content/xpcom/pdfWorker/worker.js');
    worker.onmessage = event => {
        resolve(event.data.data);
        worker.terminate();
    };
    worker.postMessage(
        {
            id: 0,
            action: 'getFulltext',
            data: { buf: file.buffer },
        },
        [file.buffer],
    );
}

export async function getPdfDoc(url: string) {
    const file = await fetch(url),
        data = await file.arrayBuffer();
    return pdfjsLib.getDocument({ data, useWorkerFetch: false }).promise;
}

async function getPageImages(pdf: PDFDocumentProxy, pageIdx: number, url: string) {
    const page = await pdf.getPage(pageIdx + 1),
        opList = await page.getOperatorList(),
        imgList = opList.fnArray
            .map((fn, i) => (fn == pdfjsLib.OPS.paintImageXObject ? i : undefined))
            .filter(Boolean) as number[],
        datList = await Promise.all(imgList.map(
            i => new Promise<{ dat: ImageBitmap | null, idx?: number }>(resolve => {
                const id = opList.argsArray[i][0], timer = setTimeout(() => {
                    console.warn(`Image ${id} timed out in page ${pageIdx + 1}`);
                    resolve({ dat: null });
                }, 10000);
                page.objs.get(id, (dat: any) => {
                    clearTimeout(timer);
                    resolve({ dat: dat.bitmap, idx: i });
                });
            })
        ));

    for (const { dat, idx } of datList) {
        if (!dat) continue;
        const matrixes = new Array<Matrix>();
        for (let j = imgList[idx!] - 2; j > 1 && matrixes.length < 5; j -= 2)
            if (opList.fnArray[j] == pdfjsLib.OPS.transform)
                matrixes.push(opList.argsArray[j]);
            else
                break;
        const [a, , , d, e, f] = matrixes.reduceRight(multiply, [1, 0, 0, 1, 0, 0]),
            rect = [e, f, e + a, f + d];
        postMessage(
            {
                stream: {
                    method: 'allImages',
                    url,
                    pageNum: pdf.numPages,
                    imageNum: imgList.length,
                    payload: { data: dat, id: imgList[idx!], rect, pageIdx },
                } as WorkerStream,
            },
            [dat],
        );
    }
    // console.log('%c -------------------------' + pageIdx, 'color: red; font-size:20px;');
    // for (let i = 0; i < opList.fnArray.length; ++i)
    //     if (opList.fnArray[i] == 1 && opList.fnArray[i + 1] != 37) {
    //         const names = opList.fnArray.slice(i - 9, i + 6).map(op =>
    //             Object.entries(pdfjsLib.OPS).find(([, v]) => v == op)![0]
    //         ), ops = opList.argsArray.slice(i - 9, i + 6);
    //         console.table([names, ops]);
    //     }
}
export async function getAllImages(url: string) {
    const pdf = await getPdfDoc(url);
    // eslint-disable-next-line no-console
    console.time(`getAllImages(${url})`);
    await Promise.all(Array.from(
        { length: pdf.numPages },
        (_, i) => getPageImages(pdf, i, url).catch(
            error => console.error(`<${url}> Error processing page ${i + 1}:`, error)
        )
    ));
    // eslint-disable-next-line no-console
    console.timeEnd(`getAllImages(${url})`);
    return pdf.numPages;
}

type Matrix = [number, number, number, number, number, number];
function multiply(left: Matrix, right: Matrix): Matrix {
    return [
        left[0] * right[0] + left[2] * right[1],
        left[1] * right[0] + left[3] * right[1],
        left[0] * right[2] + left[2] * right[3],
        left[1] * right[2] + left[3] * right[3],
        left[0] * right[4] + left[2] * right[5] + left[4],
        left[1] * right[4] + left[3] * right[5] + left[5],
    ];
}
