interface IRecord {
    firstTime: () => number;
    lastTime: () => number;
    getTotalSeconds: () => number;
    getDateSeconds: (date: number | Date) => number;
    getDaySeconds: (day: number) => number;
    getHourSeconds: (hour: number) => number;
    mergeJSON: (json: JSON) => void;
    toJSON: () => JSON;
}

class RecordPage implements IRecord {
    private periods: Array<number>;

    /**
     * 找到第一次阅读的时间
     * @returns 秒
     */
    firstTime = () => this.periods.reduce((prev: number, curr: number) => Math.min(prev, curr), 9999999999);

    
}
