import ReadingHistory, { AttachmentHistory } from 'zotero-reading-history';

export default class CharteroReadingHistory extends ReadingHistory {
    getByDate(data: AttachmentHistory[], date: Date) {
        return accumulatePeriodIf(
            data,
            time => time.toDateString() == date.toDateString()
        );
    }
    getByDay(data: AttachmentHistory[], day: number) {
        return accumulatePeriodIf(data, time => time.getDay() == day);
    }
    getByHour(data: AttachmentHistory[], hour: number) {
        return accumulatePeriodIf(data, time => time.getHours() == hour);
    }
}

function accumulate<T>(arr: T[], callback: (e: T) => number) {
    if (arr.length > 0)
        return arr.reduce((sum: number, e) => sum + callback(e), 0);
    else return 0;
}

function accumulatePeriodIf(
    data: AttachmentHistory[],
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
