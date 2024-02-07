importScripts('resource://gre/modules/workers/require.js');
const { AbstractWorker } = require('resource://gre/modules/workers/PromiseWorker.js');

class CharteroWorker extends AbstractWorker {
    postMessage = self.postMessage.bind(self);
    close = self.close;
    log = console.debug;

    dispatch(method: string, args: any[]) {
        const target = (self as any)[method];
        if (typeof target !== 'function')
            return target;
        return target(...args);
    }
}
const worker = new CharteroWorker();
onmessage = worker.handleMessage.bind(worker);
