import { processPDF } from './pdf';
import { WorkerManagerBase, WorkerRequest, WorkerResponse } from './manager';

class WorkerManager extends WorkerManagerBase<DedicatedWorkerGlobalScope> {
    protected async onRequest(request: WorkerRequest) {
        const response: WorkerResponse = {
            id: request.id,
            result: await process(request.method, request.params),
        };
        postMessage({ response });
    }
}
export const workerManager = new WorkerManager(self);

function process(method: string, params?: any[]) {
    switch (method) {
        case 'processPDF':
            return processPDF(params![0]);

        default:
            console.log('Unknown method:', method);
    }
}
