import { zip } from '../bootstrap/modules/utils';

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
    const file = await fetch('zotero://attachment/library/items/9NZ29NR8'),
        data = await file.arrayBuffer(),
        pdf = await pdfjsLib.getDocument({
            // data: file.buffer,
            data,
            useWorkerFetch: false,
            // ownerDocument: {
            //     createElement(name: string) {
            //         if (name === 'canvas')
            //             return new OffscreenCanvas(1, 1);
            //         // console.trace('createElement', name);
            //         return null;
            //     }
            // }
        }).promise;
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i),
            opList = await page.getOperatorList(),
            ops = zip(opList.fnArray, opList.argsArray);
        // for (const [fn, args] of ops)
        //     if (fn == pdfjsLib.OPS.paintImageXObject)
        //         console.warn(page.objs.get(args[0]));

        for (let i = 0; i < ops.length; i++)
            if (opList.fnArray[i] == pdfjsLib.OPS.paintImageXObject) {
                const transform = opList.argsArray[i - 2],
                    data = page.objs.get(opList.argsArray[i][0]);
                console.debug(data, transform);
                return data.bitmap;
            }

        //             viewport = page.getViewport({ scale: 1 }),
        //             canvas = new OffscreenCanvas(viewport.width, viewport.height),
        //             ctx = canvas.getContext('2d');
        //         ctx!.fillText = () => {};
        //         await page.render({
        //             canvasContext: ctx!,
        //             viewport,
        //             intent: 'print',
        //             annotationMode: pdfjsLib.AnnotationMode.DISABLE
        //         }).promise.catch(console.error);
        //         console.debug(page.objs);
        //     }
        // return pdf;

        // const page = await pdf.getPage(2),
        //     opList = await page.getOperatorList(),
        // const svgGfx = new pdfjsLib.SVGGraphics!(page.commonObjs, page.objs);

        // const svg = await svgGfx.getSVG(opList, page.getViewport({ scale: 1 })).catch(console.trace);
        // console.info(svg.find('im'));
        // return svg;

        // fnList.map(([fn, args]) => {
        //     const op = Object.entries(pdfjsLib.OPS).find(
        //         ([, value]) => value === fn
        //     )![0],
        //         obj = page.objs.get(args[0]);
        //     return { op, obj };
        // });
    }
}
