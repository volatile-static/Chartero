import { getAllImages, processPDF } from './pdf';
import { WorkerManagerBase, WorkerRequest, WorkerResponse } from './manager';
importScripts('resource://pdf.js/build/pdf.js');

pdfjsLib.GlobalWorkerOptions.workerPort = new Worker(
    'resource://pdf.js/build/pdf.worker.js'
);

class WorkerSlave extends WorkerManagerBase<DedicatedWorkerGlobalScope> {
    protected async onRequest(request: WorkerRequest<DedicatedWorkerGlobalScope>) {
        const [result, transfer] = await process(request.method, request.params),
            response: WorkerResponse = { id: request.id, result };
        postMessage({ response }, transfer);
    }
}
export const manager = new WorkerSlave(self);

async function process(method: string, params?: any[]): Promise<[any, any[]]> {
    switch (method) {
        case 'processPDF':
            return [await processPDF(params![0]), []];

        case 'getAllImages':
            return [await getAllImages(params![0]), []];

        case 'close':
            pdfjsLib.GlobalWorkerOptions.workerPort?.terminate();
            return ['OK', []];

        default:
            console.log('Unknown method:', method);
            return [null, []];
    }
}
