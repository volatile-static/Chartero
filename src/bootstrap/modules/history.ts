import { AttachmentHistory } from 'zotero-reading-history';

export default class HistoryAnalyzer {
    private readonly data: AttachmentHistory[];
    constructor(data: AttachmentHistory[]) {
        this.data = data;
    }
    getByDate(date: Date) {
        return accumulatePeriodIf(
            this.data,
            time => time.toDateString() == date.toDateString()
        );
    }
    getByDay(day: number) {
        return accumulatePeriodIf(this.data, time => time.getDay() == day);
    }
    getByHour(hour: number) {
        return accumulatePeriodIf(this.data, time => time.getHours() == hour);
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
}

function accumulate<T>(arr: readonly T[], callback: (e: T) => number) {
    if (arr.length > 0)
        return arr.reduce((sum: number, e) => sum + callback(e), 0);
    else return 0;
}

function accumulatePeriodIf(
    data: readonly AttachmentHistory[],
    predicate: (time: Date) => boolean
) {
    const attachmentsPages = data
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
