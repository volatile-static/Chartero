import { BasicTool, BasicOptions, ManagerTool } from "zotero-plugin-toolkit/dist/basic";
import { AttachmentRecord, PageRecord } from "./data";
import { name as packageName } from "../../../../package.json";

/**
 * Convert milliseconds to seconds.
 * @param ms milliseconds
 * @returns seconds
 */
function ms2s(ms: number) {
    return Math.round(ms / 1000);
}

export default class ReadingHistory extends ManagerTool {
    /** @private 缓存的主条目，下标为libraryID */
    private _mainItems: Array<Zotero.Item | null>;

    /** @private 缓存的历史记录，下标为ID */
    private readonly _cached: Array<RecordCache | null>;

    /** @private 当前打开的阅读器 */
    private _activeReader?: _ZoteroTypes.ReaderInstance;

    private readonly _recordHook: RecordHook;

    private _scanPeriod: number;
    private _firstState: ReaderState;
    private _secondState: ReaderState;

    private _intervalID: number;
    private _mutex: boolean;
    cacheLoaded: _ZoteroTypes.PromiseObject;

    constructor(base: BasicTool | BasicOptions, hook: RecordHook) {
        super(base);

        this.cacheLoaded = Zotero.Promise.defer();
        this._recordHook = hook;
        this._mainItems = [];
        this._cached = [];
        this._firstState = {
            counter: 0,
            pageIndex: 0,
            left: 0,
            top: 0,
        };
        this._secondState = {
            counter: 0,
            pageIndex: 0,
            left: 0,
            top: 0,
        };

        this.loadAll();
    }

    register(scanPeriod: number) {
        // 初始化定时器回调函数
        this._scanPeriod = scanPeriod;
        this._intervalID = Zotero
            .getMainWindow()
            .setInterval(this.schedule.bind(this), this._scanPeriod * 1000);
    }
    unregister() {
        Zotero.getMainWindow().clearInterval(this._intervalID);
    }
    unregisterAll() {
        this.unregister();
    }

    loadAll(): void {
        const loadLib = async (libID: number) => {
            const mainItem = await this.getMainItem(libID);
            await mainItem.loadDataType("childItems"); // 等待主条目数据库加载子条目
            mainItem.getNotes().forEach(async (noteID) => {
                const noteItem = (await Zotero.Items.getAsync(
                    noteID
                )) as Zotero.Item;
                await noteItem.loadDataType("note"); // 等待笔记数据库加载
                const his = this.parseNote(noteItem);
                if (his) {
                    // 缓存解析出的记录
                    const id = Zotero.Items.getIDFromLibraryAndKey(libID, his.key);
                    id && (this._cached[id] = { note: noteItem, ...his });
                }
            });
        };
        loadLib(1).then(() =>
            Promise.all(Zotero.Groups.getAll().map((group: Zotero.DataObject) =>
                Zotero.Groups.getLibraryIDFromGroupID(group.id)
            ).map(loadLib)).then(() => this.cacheLoaded.resolve(true)));
    }

    /**
     * @private 将记录存入笔记
     */
    private saveNote(cache: RecordCache) {
        cache.note.setNote(
            `${packageName}#${cache.key}\n${JSON.stringify(cache.record)}`
        );
        return cache.note.saveTx({ skipSelect: true, skipNotifier: true });
    }

    private async getCache(attID: number) {
        if (!this._cached[attID]) {
            const attachment = Zotero.Items.get(attID);
            this._cached[attID] = {
                note: await this.newNoteItem(attachment),
                key: attachment.key,
                record: new AttachmentRecord(),
            };
        }
        return this._cached[attID] as RecordCache;
    }

    clearHistory(libraryID: number = 1) {
        for (const id in this._cached) {
            const note = this._cached[id]?.note;
            if (note && this._mainItems[libraryID]?.getNotes().includes(note.id)) {
                note.deleted = true;
                note.saveTx({ skipNotifier: true });
                delete this._cached[id];
            }
        }
    }

    isMainItem(item: Zotero.Item) {
        return this._mainItems[item.libraryID]?.id == item.id ||
            (item.itemType == "computerProgram" &&
                item.getField("archiveLocation") ==
                Zotero.URI.getLibraryURI(item.libraryID) &&
                item.getField("shortTitle") == packageName);
    }

    async isHistoryNote(item: Zotero.Item) {
        return item.itemType == "note" &&
            this._mainItems[item.libraryID]?.id == item.parentItemID;
    }

    /**
     * The callback of timer triggered periodically.
     */
    private async schedule() {
        if (this._mutex)
            return;
        this._activeReader = Zotero.Reader._readers.find((r) =>
            r._iframeWindow?.document.hasFocus() && r.type == "pdf"
        ); // refresh activated reader

        if (this._activeReader?.itemID) {
            this._mutex = true;
            const cache = await this.getCache(this._activeReader.itemID); // 当前PDF的缓存
            this.record(cache.record); // 先记录到缓存
            this.saveNote(cache).then(() => this._mutex = false); // 保存本次记录
            this._recordHook(this._activeReader);  // 插件回调函数，更新实时仪表盘
        }
    }

    /**
     * 新建与PDF相关联的笔记，存储在主条目下
     * @param attachment PDF条目
     * @returns 新建的笔记条目
     */
    private async newNoteItem(attachment: Zotero.Item): Promise<Zotero.Item> {
        const item = new Zotero.Item("note");
        item.libraryID = attachment.libraryID;
        item.parentID = (await this.getMainItem(attachment.libraryID)).id; // 若强制删除则成为独立笔记
        item.setNote(`${packageName}#${attachment.key}\n{}`);
        item.addRelatedItem(attachment);
        // 必须等待新条目存入数据库后才能建立关联
        if ((await item.saveTx()) && attachment.addRelatedItem(item))
            attachment.saveTx({ skipDateModifiedUpdate: true });
        return item;
    }

    /**
     * 根据libraryID新建主条目，用于存储笔记条目，每个文库有且仅有一个
     * @param libraryID 主条目所在文库的ID
     * @returns 新建的主条目
     */
    private async newMainItem(libraryID: number): Promise<Zotero.Item> {
        Zotero.debug(
            "[zotero-reading-history] Creating new main item in library " + libraryID
        );
        const item = new Zotero.Item("computerProgram");
        item.setField("archiveLocation", Zotero.URI.getLibraryURI(libraryID));
        item.setField("title", addon.locale.history.mainItemTitle);
        item.setField("shortTitle", packageName);
        item.setField("programmingLanguage", "JSON");
        item.setField("abstractNote", addon.locale.history.mainItemDescription);
        item.setField(
            "url",
            "https://github.com/volatile-static/Chartero"
        );
        if (Zotero.Groups.getByLibraryID(libraryID))
            item.setField(
                "libraryCatalog",
                Zotero.Groups.getByLibraryID(libraryID).name
            );
        item.setCreators([{
            creatorType: "programmer",
            firstName: "volatile",
            lastName: "static",
        }]);
        item.libraryID = libraryID;
        await item.saveTx();
        this._mainItems[libraryID] = item;
        return item;
    }

    /**
     * 搜索文库中的主条目，若不存在则新建。
     * @summary 同时满足以下三点被认为是主条目：
     * 1. shortTitle is {@link packageName}
     * 2. itemType is computerProgram
     * 3. archiveLocation is {@link Zotero.URI.getLibraryURI}
     * @param [libraryID=1] 默认为用户文库
     * @returns 已有的或新建的主条目
     */
    async getMainItem(libraryID: number = 1): Promise<Zotero.Item> {
        if (this._mainItems[libraryID]) return this._mainItems[libraryID]!;

        const searcher = new Zotero.Search();
        searcher.addCondition("libraryID", "is", String(libraryID));
        searcher.addCondition("shortTitle", "is", packageName);
        searcher.addCondition("itemType", "is", "computerProgram");
        searcher.addCondition(
            "archiveLocation",
            "is",
            Zotero.URI.getLibraryURI(libraryID)
        );
        const ids = await searcher.search();
        this.log('got main item(s): ', ids);

        if (!ids.length) return this.newMainItem(libraryID); // 没搜到，新建
        if (ids.length > 1) {
            await Zotero.Items.merge(
                Zotero.Items.get(ids[0]),
                Zotero.Items.get(ids.slice(1))
            );
            this.log('merge main item ', ids.slice(1), ' into ', ids[0]);
        }
        return (this._mainItems[libraryID] = (await Zotero.Items.getAsync(
            ids[0]
        )) as Zotero.Item);
    }

    /**
     * 解析笔记条目中的历史记录
     * @param noteItem 存储历史记录的笔记条目
     * @returns record是一个AttachmentRecord实例，key是PDF条目的key
     */
    parseNote(noteItem: Zotero.Item): HistoryAtt | null {
        const note = noteItem.note,
            [header, data] = note.split("\n"), // 第一行是标题，第二行是数据
            [sign, key] = header.split("#");

        if (sign != packageName || key?.length < 1) return null;
        let json = {};
        try {
            json = JSON.parse(data);
        } catch (error) {
            if (error instanceof SyntaxError) {
                data.replace(/<\/?\w+>/g, ""); // TODO: 考虑更复杂的情况
                json = JSON.parse(data);
            } else {
                window.console.trace(error);
                return null;
            }
        }
        return { record: new AttachmentRecord(json), key };
    }

    /**
     * 须确保{@link _activeReader}已载入
     * @param history 待记录的对象，函数有副作用
     * @returns 与参数一样
     */
    private record(history: AttachmentRecord) {
        const recordPage = (stats: _ZoteroTypes.Reader.ViewStats) => {
            const pageHis = (history.pages[stats.pageIndex!] ??= new PageRecord());

            history.numPages ??= stats.pagesCount;
            pageHis.period ??= {};
            pageHis.period[ms2s(new Date().getTime())] = Number(this._scanPeriod);

            const item = Zotero.Items.getLibraryAndKeyFromID(
                this._activeReader!.itemID!
            );
            // 只有群组才记录不同用户
            if (item && item.libraryID > 1) {
                pageHis.userSeconds ??= {};
                const userID = Zotero.Users.getCurrentUserID();
                pageHis.userSeconds[userID] =
                    (pageHis.userSeconds[userID] ?? 0) + this._scanPeriod;
            }
            addon.log('record page ', stats.pageIndex, ' with ', this._scanPeriod);
        },
            checkState = (
                thisState: ReaderState,
                thatState: _ZoteroTypes.Reader.State
            ) => {
                if (
                    thisState.pageIndex == thatState.pageIndex &&
                    thisState.top == thatState.top &&
                    thatState.left == thatState.left
                )
                    ++thisState.counter;
                else {
                    thisState.pageIndex = thatState.pageIndex;
                    thisState.top = thatState.top;
                    thisState.left = thatState.left;
                    thisState.counter = 0;
                }
                return thisState.counter < 20; //  TODO: 用户自定义
            };
        //  先检查副屏
        if (
            this._activeReader!._secondaryView &&
            checkState(this._secondState, this._activeReader!._state.secondaryViewState)
        )
            recordPage(this._activeReader!._state.secondaryViewStats);
        //  再检查主屏
        if (checkState(this._firstState, this._activeReader!._state.primaryViewState))
            recordPage(this._activeReader!._state.primaryViewStats);
    }

    compress(record: AttachmentRecord) {
        record.pageArr.forEach((page) => {
            if (!page.period) return;
            let start = 0, // 开始合并的时间戳
                total = 0, // 连续时长
                processing = false, // 是否正在合并
                compressed: { [timestamp: number]: number } = {}; // 压缩后的period

            Object.keys(page.period)
                .map((t) => parseInt(t))
                .filter((t) => !isNaN(t))
                .forEach((t) => {
                    if (t - start == total) {
                        // 相连的时间戳合并
                        total += page.period![t];
                        processing = true;
                    } else {
                        if (processing) {
                            // 结束合并
                            processing = false;
                            compressed[start] = total;
                        }
                        start = t;
                        total = page.period![t];
                    }
                });
            compressed[start] = total; // 保存最后一个连续的时间戳
            page.period = compressed;
        });
    }

    getByAttachment(att: Zotero.Item | number): AttachmentHistory | null {
        return this._cached[typeof att == "number" ? att : att.id];
    }

    /**
     *  @file chrome\content\zotero\xpcom\data\item.js
     *  @see Zotero.Item.getBestAttachments
     */
    async getInTopLevel(item: Zotero.Item) {
        if (!item.isRegularItem()) return [];
        await item.loadDataType("itemData");
        const zotero = BasicTool.getZotero(),
            url = item.getField("url"),
            urlFieldID = zotero.ItemFields.getID("url"),
            sql =
                "SELECT IA.itemID FROM itemAttachments IA NATURAL JOIN items I " +
                `LEFT JOIN itemData ID ON (IA.itemID=ID.itemID AND fieldID=${urlFieldID}) ` +
                "LEFT JOIN itemDataValues IDV ON (ID.valueID=IDV.valueID) " +
                `WHERE parentItemID=? AND linkMode NOT IN (${zotero.Attachments.LINK_MODE_LINKED_URL}) ` +
                "AND IA.itemID NOT IN (SELECT itemID FROM deletedItems) " +
                "ORDER BY contentType='application/pdf' DESC, value=? DESC, dateAdded ASC",
            itemIDs: number[] = await Zotero.DB.columnQueryAsync(sql, [item.id, url]);
        return itemIDs
            .map((id) => this.getByAttachment(id))
            .filter((his) => his) as AttachmentHistory[];
    }

    getInTopLevelSync(item: Zotero.Item) {
        return item
            .getAttachments()
            .map((id) => this.getByAttachment(id))
            .filter((his) => his) as AttachmentHistory[];
    }

    getInCollection(collection: Zotero.Collection) {
        return collection
            .getChildItems()
            .filter((it) => it.isRegularItem())
            .map((it) => this.getInTopLevel(it));
    }

    getInLibrary(libraryID: number = 1) {
        return this._cached.filter(
            (c) => c?.note.libraryID == libraryID
        ) as AttachmentHistory[];
    }

    getAll() {
        return this._cached;
    }
}

type RecordHook = (reader: _ZoteroTypes.ReaderInstance) => void;

type AttachmentHistory = Readonly<RecordCache>;

interface HistoryAtt {
    key: string;
    record: AttachmentRecord;
}

export interface RecordCache extends HistoryAtt {
    note: Zotero.Item;
}

interface ReaderState {
    pageIndex: number;
    top: number;
    left: number;
    counter: number;
}
