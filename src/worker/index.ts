import { getPdfDoc, processPDF } from './pdf';
import { WorkerManagerBase, WorkerRequest, WorkerResponse } from './manager';
importScripts('resource://zotero/reader/pdf/build/pdf.js');

pdfjsLib.GlobalWorkerOptions.workerPort = new Worker(
    'resource://zotero/reader/pdf/build/pdf.worker.js'
);

class SVGElement {
    children: SVGElement[] = [];
    attributes: Record<string, string> = {};
    constructor(public readonly tag: string) { }

    setAttribute(name: string, value: string) {
        // console.log(this.tag, 'setAttribute', name, value);
        this.attributes[name] = value;
    }
    setAttributeNS(ns: string, name: string, value: string) {
        // console.log(this.tag, 'setAttributeNS', ns, name, value);
        this.attributes[name] = value;
    }
    append(...children: SVGElement[]) {
        // console.log(this.tag, 'append', children);
        this.children.push(...children);
    }
    cloneNode() {
        // console.warn(this.tag, 'cloneNode', this.attributes, this.children);
        return new SVGElement(this.tag);
    }

    find(tag: string): SVGElement | undefined {
        if (this.tag.includes(tag))
            return this;
        for (const child of this.children) {
            const result = child.find(tag);
            if (result)
                return result;
        }
    }
}

self.document = {
    createElementNS(ns: string, name: string) {
        if (name.includes('im'))
            console.trace(ns, name);
        if (ns === 'http://www.w3.org/2000/svg' && name.startsWith('svg:'))
            return new SVGElement(name.slice(4));
        return null;
    }
}
class WorkerManager extends WorkerManagerBase<DedicatedWorkerGlobalScope> {
    protected async onRequest(request: WorkerRequest) {
        const response: WorkerResponse = {
            id: request.id,
            result: await process(request.method, request.params),
        };
        postMessage({ response }, [response.result]);
    }
}
export const workerManager = new WorkerManager(self);

function process(method: string, params?: any[]) {
    switch (method) {
        case 'processPDF':
            return processPDF(params![0]);

        default:
            console.log('Unknown method:', method);
            break;
    }
}
