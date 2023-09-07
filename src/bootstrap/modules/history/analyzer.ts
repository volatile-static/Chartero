import type { AttachmentHistory } from './history';

export default class HistoryAnalyzer {
    private readonly data: AttachmentHistory[];
    private _attachments: Array<false | Zotero.Item>;
    constructor(data: MaybeArray<AttachmentHistory> | Zotero.Item) {
        if (Array.isArray(data))
            this.data = data;
        else if (data instanceof addon.getGlobal('Zotero').Item)
            if (data.isRegularItem())
                this.data = addon.history.getInTopLevelSync(data);
            else {
                const tmp = addon.history.getByAttachment(data);
                this.data = tmp ? [tmp] : [];
            }
        else
            this.data = [data];
        this._attachments = [];
    }
    get ids() {
        return this.data.map(
            his =>
                addon
                    .getGlobal('Zotero')
                    .Items.getIDFromLibraryAndKey(
                        his.note.libraryID,
                        his.key
                    ) || undefined
        );
    }
    get attachments() {
        const Items = addon.getGlobal('Zotero').Items;
        if (this._attachments.length != this.data.length)
            this._attachments = this.data.map(attHis =>
                Items.getByLibraryAndKey(attHis.note.libraryID, attHis.key)
            ) as Array<false | Zotero.Item>;
        return this._attachments;
    }
    get validAttachments() {
        return this.attachments.filter(att => att) as Zotero.Item[];
    }
    get titles() {
        return this.attachments.map(att =>
            att ? (att.getField('title') as string) : undefined
        );
    }
    get parents() {
        return this.validAttachments.map(att => att.parentItem);
    }
    getByDate(date: Date) {
        return this.accumulatePeriodIf(
            time => time.toDateString() == date.toDateString()
        );
    }
    getByDay(day: number) {
        return this.accumulatePeriodIf(time => time.getDay() == day);
    }
    getByHour(hour: number) {
        return this.accumulatePeriodIf(time => time.getHours() == hour);
    }
    get firstTime() {
        const maxT = 9999999999;
        return this.data.reduce(
            (result, history) =>
                Math.min(result, history.record.firstTime ?? maxT),
            maxT
        );
    }
    get lastTime() {
        return this.data.reduce(
            (result, history) => Math.max(result, history.record.lastTime ?? 0),
            0
        );
    }
    get progress() {
        const read = accumulate(this.data, his => his.record.readPages),
            total = accumulate(this.data, his => his.record.numPages ?? 0);
        if (total == 0) return 0;
        else return Math.round((100 * read) / total);
    }
    get totalS() {
        return accumulate(this.data, his => his.record.totalS);
    }
    get dateTimeMap() {
        const result: { [key: string]: { date: number; time: number } } = {};
        this.forEachPeriod((date, time) => {
            result[date.toLocaleDateString()] ??= {
                date: date.getTime(), // 仅记录当天第一次遇到的记录
                time: 0,
            };
            result[date.toLocaleDateString()].time += time;
        });
        return result;
    }
    get dateTimeStats() {
        return Object.values(this.dateTimeMap).sort((a, b) => a.date - b.date);
    }
    private accumulatePeriodIf(predicate: (time: Date) => boolean) {
        const attachmentsPages = this.data
            .map(history => history.record.pageArr)
            .filter(pages => pages.length > 0);

        return accumulate(attachmentsPages, pageRecords => {
            const pagesPeriod = pageRecords
                .filter(pageRecord => pageRecord.period)
                .map(pageRecord => Object.entries(pageRecord.period!));

            return accumulate(pagesPeriod, periodEntries =>
                accumulate(periodEntries, ([timestamp, period]) =>
                    predicate(new Date(parseInt(timestamp) * 1000)) ? period : 0
                )
            );
        });
    }
    forEachPeriod(callback: (time: Date, period: number) => void) {
        const attachmentsPages = this.data.map(
            history => history.record.pageArr
        );

        for (const pageRecords of attachmentsPages)
            for (const pageRecord of pageRecords)
                if (pageRecord.period)
                    for (const [timestamp, period] of Object.entries(
                        pageRecord.period
                    ))
                        callback(new Date(parseInt(timestamp) * 1000), period);
    }
}

function accumulate<T>(arr: readonly T[], callback: (e: T) => number) {
    if (arr.length > 0)
        return arr.reduce((sum: number, e) => sum + callback(e), 0);
    else return 0;
}
