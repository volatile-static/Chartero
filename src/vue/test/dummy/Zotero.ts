import fetchSync from './fetch';

class Item {
    constructor(public id: number) {
        return new Proxy(this, {
            get(target, prop: string) {
                const itemStr = `Zotero.Items.get(${target.id})`,
                    propType = fetchSync(`typeof ${itemStr}['${prop}']`);
                if (prop == 'id') return target.id;
                if (propType == 'function')
                    return (...args: string[]) =>
                        fetchSync(`${itemStr}.${prop}(${args.map(str => `'${str}'`).join(', ')})`);
                return fetchSync(`${itemStr}.${prop}`);
            },
        });
    }
}

export default class Zotero {
    Items = {
        get(id: number | number[]) {
            if (Array.isArray(id)) return id.map(id => new Item(id));
            return new Item(id);
        },
    };
}
