import { BasicOptions, BasicTool, ManagerTool } from "zotero-plugin-toolkit/dist/basic";

/**
 * Manage all monkey patching functions.
 */
export class PatcherManager extends ManagerTool {
    // record wether a patcher is alive or not
    protected readonly patcherIDs: Map<string, boolean> = new Map();

    constructor(base?: BasicTool | BasicOptions) {
        super(base);
    }

    /**
     * Patch a function
     * @param object The owner of the function
     * @param funcSign The signature of the function(function name)
     * @param patcher A function that returns the new wrapper of the patched function
     * @returns A unique ID of the patcher, which can be used to unregister the patcher
     */
    register<T, K extends FunctionNamesOf<T>>(
        object: T,
        funcSign: K,
        patcher: (origin: T[K]) => T[K]
    ): string {
        const id = this.getGlobal('Zotero').randomString(),
            ids = this.patcherIDs,
            origin = object[funcSign];
        ids.set(id, true);
        this.log("patching ", funcSign);

        (object[funcSign] as any) = function (this: T, ...args: any[]) {
            if (ids.get(id))
                try {
                    return (patcher(origin) as Function).apply(this, args);
                } catch (e) {
                    window.console.trace(e);  // print error message and then call origin function
                }
            return (origin as Function).apply(this, args);
        };
        return id;
    }

    /**
     * @param patcherID The ID of the patcher to be unregistered
     */
    unregister(patcherID: string) {
        this.patcherIDs.delete(patcherID);
    }

    /**
     * Unregister all patchers
     */
    unregisterAll() {
        this.patcherIDs.clear();
    }
}

type FunctionNamesOf<T> = keyof FunctionsOf<T>;  // 这个文件内去掉，在basic里export出来

type FunctionsOf<T> = {  // 这个类型不用export
    [K in keyof T as T[K] extends Function ? K : never]: T[K];
};
