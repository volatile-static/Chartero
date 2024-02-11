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
                    transform = matrixes.reduce(
                        (tran, mat) => {
                            const [a, b, c, d, e, f] = mat,
                                [A, B, C, D, E, F] = tran;
                            return [
                                a * A + c * B,
                                b * A + d * B,
                                a * C + c * D,
                                b * C + d * D,
                                a * E + c * F + e,
                                b * E + d * F + f,
                            ];
                        },
                        [1, 0, 0, 1, 0, 0],
                    ),
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
                        },
                    },
                    [data],
                );
            }
    }
    return pdf.numPages;
}
