import { ClipboardHelper, FilePickerHelper } from 'zotero-plugin-toolkit';
import { WorkerManagerBase, WorkerRequest, WorkerResponse } from '../../worker/manager';

export const ICON_URL = 'resource://chartero/icons/icon.svg';

// const { renderToStaticMarkup } = window.require('react-dom-server');
// export { renderToStaticMarkup };

export function copySVG2JPG(svg: string) {
    const img = new window.Image();
    img.onload = () => {
        const canvas = document.createElement('canvas'),
            ctx = canvas?.getContext('2d');
        canvas.height = img.height;
        canvas.width = img.width;
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        new ClipboardHelper().addImage(canvas.toDataURL('image/png')).copy();
    };
    img.src = URL.createObjectURL(
        new window.Blob([svg], {
            type: 'image/svg+xml;charset-utf-16',
        })
    );
}

export async function saveSVG(svg: string) {
    const result = await new FilePickerHelper(
        addon.locale.saveSVG,
        'save',
        [[addon.locale.svg, '*.svg']]
    ).open();
    if (result) {
        const File = addon.getGlobal('FileUtils').File;
        addon
            .getGlobal('Zotero')
            .File.putContents(new File(result + '.svg'), svg);
    }
}

export function showMessage(msg: string, icon: string) {
    const Notification = addon.getGlobal('Notification');
    new Notification('Chartero', {
        body: msg,
        icon,
    });
}

export function toTimeString(seconds: number | string) {
    function s2hour(s: number) {
        return {
            second: s % 60,
            minute: Math.floor(s / 60) % 60,
            hour: Math.floor(s / 3600),
        };
    }
    const tim = s2hour(
        typeof seconds == 'number' ? seconds : parseInt(seconds)
    );
    let label = '';
    if (tim.hour) label = tim.hour + addon.locale.hours;
    if (tim.minute) label += tim.minute + addon.locale.minutes;
    if (label.length < 1) label = seconds + addon.locale.seconds;
    else if (!tim.hour && tim.second)
        label += tim.second + addon.locale.seconds;
    return label;
}

export function accumulate<T>(arr: T[], key: keyof T): number {
    return arr.reduce((acc, cur) => acc + Number(cur[key]), 0);
}

async function patchFileURL(url: string) {
    if (!/chrome:\/\//.test(url)) return url;
    const res = await fetch(url),
        blob = await res.blob(),
        reader = new FileReader();
    return new Promise(resolve => {
        reader.onload = event => {
            resolve(event.target?.result as string);
        };
        reader.onerror = error => { throw error; };
        reader.readAsDataURL(blob);
    });
}

async function evalCmd(cmd: string) {
    addon.log('eval cmd:', cmd);
    const result = new Function(
        'Zotero', 'ZoteroPane', 'addon', 'return ' + cmd
    )(Zotero, Zotero.getActiveZoteroPane(), addon);
    addon.log(result);

    if (typeof result == 'string')
        return patchFileURL(result);
    return result;
}

export class DebuggerBackend implements _ZoteroTypes.Server.Endpoint {
    supportedMethods = ['POST'];
    init: _ZoteroTypes.Server.initMethodPromise = async function (options) {
        const headers = {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*' // 允许跨域
        };
        try {
            const result = await evalCmd(options.data);
            return [200, headers, JSON.stringify(result)];
        } catch (error) {
            Zotero.logError(error);
            if (error instanceof Error)
                return [400, headers, JSON.stringify({ msg: error.message })];
            return [500, headers, JSON.stringify(error)];
        }
    };
}

export type PdfImageListener = (pageNum: number, imageNum: number, payload: {
    data: ImageBitmap,
    id: string,
    rect: number[],
    pageIdx: number,
    // path: string
}) => void;
export class WorkerManager extends WorkerManagerBase<Worker> {
    private readonly pdfListeners: Record<string, PdfImageListener> = {};

    protected async onRequest(request: WorkerRequest<Worker>) {
        try {
            const result = await evalCmd(request.method),
                response: WorkerResponse = { id: request.id, result };
            this.that.postMessage({ response });
        } catch (error) {
            addon.log(error);
            this.that.postMessage({
                response: {
                    id: request.id,
                    result: error
                } as WorkerResponse
            });
        }
    }
    protected onDefault(data: _ZoteroTypes.anyObj) {
        if (data.stream?.method == 'allImages') {
            const listener = this.pdfListeners[data.stream.url];
            if (listener) listener(data.stream.pageNum, data.stream.imageNum, data.stream.payload);
        }
    }
    subscribePDF(id: string, listener: PdfImageListener) {
        this.pdfListeners[id] = listener;
    }
    async close() {
        await this.query('close');
        if (__dev__)
            addon.log('worker terminated');
        this.that.terminate();
    }
}

export function isPDFReader(
    reader: _ZoteroTypes.ReaderInstance
): reader is _ZoteroTypes.ReaderInstance<'pdf'> {
    return reader.type == 'pdf';
}

export function isEpubReader(
    reader: _ZoteroTypes.ReaderInstance
): reader is _ZoteroTypes.ReaderInstance<'epub'> {
    return reader.type == 'epub';
}

export function isWebReader(
    reader: _ZoteroTypes.ReaderInstance
): reader is _ZoteroTypes.ReaderInstance<'snapshot'> {
    return reader.type == 'snapshot';
}

export function zip<T, U>(a: T[], b: U[]): [T, U][] {
    const length = Math.min(a.length, b.length);
    return Array.from({ length }, (v, i) => [a[i], b[i]]);
}
