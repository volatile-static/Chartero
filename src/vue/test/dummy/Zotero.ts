import fetchSync from './fetch';
import { debounce } from 'lodash';
import BlueBird from 'bluebird';

class Item {
    constructor(public id: number) {
        return new Proxy(this, {
            get(target, prop: string) {
                if (typeof prop != 'string') return null;
                if (prop == 'id') return target.id;
                if (prop == 'getBestAttachment') return target.getBestAttachment;
                if (prop.startsWith('__v_')) return Reflect.get(target, prop);

                const itemStr = `Zotero.Items.get(${target.id})`,
                    propType = fetchSync(`typeof ${itemStr}['${prop}']`);
                if (propType == 'function')
                    return (...args: string[]) =>
                        fetchSync(`${itemStr}.${prop}(${args.map(str => `'${str}'`).join(', ')})`);
                return fetchSync(`${itemStr}.${prop}`);
            },
        });
    }
    async getBestAttachment() {
        const att = fetchSync(`Zotero.Items.get(${this.id}).getBestAttachment()`);
        if (!att.key) return null;
        return new Item(fetchSync(`Zotero.Items.getIDFromLibraryAndKey(1, '${att.key}')`));
    }
}

class Collection {
    constructor(public id: number) {}
}

export default class Zotero {
    Promise = BlueBird;
    Item = Item;
    Items = {
        get(id: number | number[]) {
            if (Array.isArray(id)) return id.map(id => new Item(id));
            return new Item(id);
        },
        getIDFromLibraryAndKey(libraryID: number, key: string) {
            return fetchSync(`Zotero.Items.getIDFromLibraryAndKey(${libraryID}, '${key}')`);
        },
        getByLibraryAndKey(libraryID: number, key: string) {
            return new Item(this.getIDFromLibraryAndKey(libraryID, key));
        },
        getTopLevel(items: Item[]) {
            return [
                ...new Set(
                    items.map(item => new Item(fetchSync(`Zotero.Items.get(${item.id}).topLevelItem.id`))),
                ),
            ];
        },
    };
    Collections = {
        getByLibrary(libraryID: number, recursive: boolean) {
            return [];
        },
    };
    Libraries = {
        userLibraryID: 1,
        userLibrary: { name: 'Test Library' },
    };
    Tags = {
        getID(tag: string) {
            return fetchSync(`Zotero.Tags.getID('${tag}')`);
        },
        getName(tagID: number) {
            return fetchSync(`Zotero.Tags.getName(${tagID})`);
        },
        async getAutomaticInLibrary(libraryID: number) {
            return fetchSync(`Zotero.Tags.getAutomaticInLibrary(${libraryID})`);
        },
    };
    Prefs = {
        get(pref: string) {
            return fetchSync(`Zotero.Prefs.get('${pref}')`);
        },
        set() {
            // no-op
        },
    };
    Utilities = {
        debounce,
    };
    File = {
        pathToFile(path: string) {
            return new Proxy(
                { path },
                {
                    get(target, prop: string) {
                        const p = target.path.replace(/\\/g, '\\\\');
                        return fetchSync(`Zotero.File.pathToFile('${p}').${prop}`);
                    },
                },
            );
        },
        getResource(path: string) {
            return fetchSync(`Zotero.File.getResource('${path}')`);
        },
    };
    greenfrog = {};
}
