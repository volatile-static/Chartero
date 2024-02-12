import type { getAllImages, getPdfDoc, processPDF } from './pdf';

export interface WorkerMethods {
    getAllImages: typeof getAllImages;
    getPdfDoc: typeof getPdfDoc;
    processPDF: typeof processPDF;
    close: typeof Worker.prototype.terminate;
}
export type WorkerMethodParams<T extends keyof WorkerMethods> = Parameters<WorkerMethods[T]>;
export type WorkerMethodResult<T extends keyof WorkerMethods> = ReturnType<WorkerMethods[T]>;

type UnwrapPromise<T> = Promise<Awaited<T>>; // 防止双重Promise

type QuerySlave<K extends keyof WorkerMethods> = (
    method: K,
    ...params: WorkerMethodParams<K>
) => UnwrapPromise<WorkerMethodResult<K>>;
type QueryMaster = (method: 'eval', cmd: string) => Promise<any>;

type WorkerMode = Worker | DedicatedWorkerGlobalScope;
export abstract class WorkerManagerBase<T extends WorkerMode> {
    private readonly queue = new TaskQueue();
    constructor(protected readonly that: T) {
        that.onmessage = event => {
            if (event.data?.response) this.onResponse(event.data.response);
            else if (event.data?.request) this.onRequest(event.data.request);
            else this.onDefault(event.data);
        };
    }
    protected abstract onRequest(request: WorkerRequest<T>): void;
    protected onDefault(data: any) {
        throw new Error('Unknown message: ' + JSON.stringify(data));
    }
    private onResponse(response: WorkerResponse) {
        const { resolve } = this.queue.pop(response.id);
        resolve(response.result);
    }

    query: T extends Worker ? QuerySlave<keyof WorkerMethods> : QueryMaster = (
        method: any,
        ...params: any[]
    ) => {
        return new Promise<any>((resolve, reject) => {
            const id = this.queue.push({ resolve, reject }),
                request: WorkerRequest<T> = { id, method, params };
            this.that.postMessage({ request });
        });
    };
}

export interface WorkerRequest<T extends WorkerMode, K extends keyof WorkerMethods = any> {
    id: number;
    method: T extends Worker ? K : 'eval';
    params?: T extends Worker ? WorkerMethodParams<K> : any[];
}

export interface WorkerResponse {
    id: number;
    result: Awaited<WorkerMethodResult<keyof WorkerMethods>>;
}

export interface WorkerStream {
    [key: string]: any;
    method: string;
    payload: object;
}

interface Task {
    resolve: (value: any) => void;
    reject: (reason?: any) => void;
}

class TaskQueue {
    private readonly data: { [id: number]: Task } = {};
    private head = 0;

    push(task: Task) {
        this.data[this.head] = task;
        return this.head++;
    }
    pop(id: number) {
        const task = this.data[id];
        delete this.data[id];
        return task;
    }
}
