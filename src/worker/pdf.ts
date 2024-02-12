import type { WorkerStream } from "./manager";

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

export async function getAllImages(url: string) {
    const pdf = await getPdfDoc(url);
    // result = new Array<[ImageBitmap, number[]]>();
    for (let p = 1; p <= pdf.numPages; p++) {
        const page = await pdf.getPage(p),
            opList = await page.getOperatorList();
        for (let i = 6; i < opList.fnArray.length; i++)
            if (
                opList.fnArray[i] == pdfjsLib.OPS.paintImageXObject &&
                [2, 4, 6].every(j => opList.fnArray[i - j] == pdfjsLib.OPS.transform)
            ) {
                const matrixes: Array<number[]> = [2, 4, 6].map(j => opList.argsArray[i - j]),
                    id = opList.argsArray[i][0],
                    data: ImageBitmap = page.objs.get(id).bitmap,
                    transform = matrixes.reduce(multiply, [1, 0, 0, 1, 0, 0]),
                    rect = {
                        left: transform[4],
                        bottom: transform[5],
                        right: transform[4] + transform[0],
                        top: transform[5] + transform[3],
                    };
                postMessage(
                    {
                        stream: {
                            method: 'allImages',
                            url,
                            page: p - 1,
                            pages: pdf.numPages,
                            payload: { data, rect, id },
                        } as WorkerStream,
                    },
                    [data],
                );
            }
    }
    return pdf.numPages;
}

function multiply(left: number[], right: number[]) {
    return [
        left[0] * right[0] + left[2] * right[1],
        left[1] * right[0] + left[3] * right[1],
        left[0] * right[2] + left[2] * right[3],
        left[1] * right[2] + left[3] * right[3],
        left[0] * right[4] + left[2] * right[5] + left[4],
        left[1] * right[4] + left[3] * right[5] + left[5],
    ];
}
