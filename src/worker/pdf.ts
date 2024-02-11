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
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i),
            opList = await page.getOperatorList();
        for (let i = 0; i < opList.fnArray.length; i++)
            if (opList.fnArray[i] == pdfjsLib.OPS.paintImageXObject) {
                console.table(opList.argsArray.slice(i - 10, i + 5));
                const transform = opList.argsArray[i - 2],
                    data = page.objs.get(opList.argsArray[i][0]).bitmap;
                postMessage({
                    stream: {
                        payload: {data, transform},
                        method: 'allImages',
                        url,
                        page: i,
                        pages: pdf.numPages,
                    }
                }, [data]);
            }
    }
    return pdf.numPages;
}
