export abstract class WorkerManagerBase<T extends Worker | DedicatedWorkerGlobalScope>{
    private readonly queue = new TaskQueue();
    constructor(protected readonly that: T) {
        that.onmessage = event => {
            if (event.data.response) this.onResponse(event.data.response);
            else if (event.data.request) this.onRequest(event.data.request);
            else this.onDefault(event.data);
        };
    }
    protected abstract onRequest(request: WorkerRequest): void;
    protected onDefault(data: any) {
        throw new Error('Unknown message: ' + JSON.stringify(data));
    }
    private onResponse(response: WorkerResponse) {
        const { resolve } = this.queue.pop(response.id);
        resolve(response.result);
    }
    query(method: string, ...params: any[]) {
        return new Promise((resolve, reject) => {
            const id = this.queue.push({ resolve, reject }),
                request: WorkerRequest = { id, method, params };
            this.that.postMessage({ request });
        });
    }
}

export interface WorkerRequest {
    id: number;
    method: string;
    params?: any[];
}

export interface WorkerResponse {
    id: number;
    result: any;
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
