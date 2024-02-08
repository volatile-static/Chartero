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
