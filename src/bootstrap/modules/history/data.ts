interface RecordBase {
  /** 阅读历史总时长，单位秒 */
  totalS?: number;

  /** 第一次阅读的时间戳 */
  firstTime?: number;

  /** 最后一次阅读的时间戳 */
  lastTime?: number;

  /**
   * 获取当前用户的阅读时长
   * @param userID 使用{@link Zotero.Users.getCurrentUserID()}
   */
  getUserTotalSeconds(userID: number): number | undefined;

  mergeJSON(json: object): void;
}

export class PageRecord implements RecordBase {
  period?: { [timestamp: number]: number };
  userSeconds?: { [user: number]: number };
  totalSeconds?: number;
  selectText?: number;
  constructor(json?: object) {
    if (json) this.mergeJSON(json);
  }

  mergeJSON(json: _ZoteroTypes.anyObj): void {
    if (json.p) {
      this.period ??= {};
      for (const t in json.p)
        if (parseInt(t) > 0 && Object.prototype.hasOwnProperty.call(json.p, t))
          this.period[parseInt(t)] = json.p[t]; // 时间戳是唯一的，这里就不再求和了
    }
    typeof json.t == "number" &&
      (this.totalSeconds = (this.totalSeconds ?? 0) + json.t);
    typeof json.s == "number" &&
      (this.selectText = (this.selectText ?? 0) + json.s);
    typeof json.u == "object" &&
      (this.userSeconds = { ...this.userSeconds ?? {}, ...json.u });
  }
  toJSON() {
    return {
      t: this.totalSeconds,
      s: this.selectText,
      p: this.period,
      u: this.userSeconds,
    };
  }

  public get totalS() {
    return (
      this.totalSeconds ??
      (this.period && Object.values(this.period).reduce((sum, p) => sum + p))
    );
  }

  public get firstTime(): number | undefined {
    if (!this.period) return;
    const arr = Object.keys(this.period);
    if (arr.length) return parseInt(arr.sort()[0]);
  }

  public get lastTime(): number | undefined {
    if (!this.period) return;
    const arr = Object.keys(this.period);
    if (arr.length)
      return arr.reduce(
        (result, timestamp) => Math.max(result, parseInt(timestamp)),
        0
      );
  }

  public get userIDs(): number[] {
    return this.userSeconds ? Object.keys(this.userSeconds).map(Number) : [];
  }

  getUserTotalSeconds(userID: number): number | undefined {
    if (this.userSeconds) return this.userSeconds[userID];
  }
}

export class AttachmentRecord implements RecordBase {
  [key: string]: unknown;
  pages: { [page: number]: PageRecord };
  numPages?: number;

  constructor(numberOfPages?: number);
  constructor(json?: object);
  constructor(arg?: number | object) {
    this.pages = {};
    switch (typeof arg) {
      case "number":
        this.numPages = arg;
        break;
      case "object":
        this.mergeJSON(arg);
        break;
      default:
        break;
    }
  }
  mergeJSON(json: _ZoteroTypes.anyObj): void {
    for (const key in json)
      if (Object.prototype.hasOwnProperty.call(json, key)) {
        if (key === "pages") {
          for (const page in json.pages)
            if (parseInt(page) >= 0)
              (this.pages[parseInt(page)] ??= new PageRecord()).mergeJSON(
                json.pages[page]
              );
        } else this[key] = json[key];
      }
  }

  get pageArr() {
    return Object.values(this.pages);
  }

  /** 获取有阅读记录的页数 */
  public get readPages(): number {
    const completeThreshold = addon.getPref("completeThreshold");
    return this.pageArr.filter(page => (page.totalS ?? 0) > completeThreshold).length;
  }

  get firstPage() {
    return Object.keys(this.pages)
      .map((p) => parseInt(p))
      .sort((a, b) => a - b)[0];
  }
  get lastPage() {
    return Object.keys(this.pages).reduce(
      (last, page) => Math.max(last, parseInt(page)),
      0
    );
  }

  public get firstTime() {
    const arr = this.pageArr
      .map((p) => p.firstTime)
      .filter((p) => p) as number[];

    if (arr.length)
      return arr.reduce(
        (result, timestamp) => Math.min(result, timestamp),
        Infinity
      );
  }

  public get lastTime() {
    const arr = this.pageArr
      .map((p) => p.lastTime)
      .filter((p) => p) as number[];

    if (arr.length)
      return arr.reduce((result, timestamp) => Math.max(result, timestamp), 0);
  }

  public get totalS() {
    return this.pageArr.reduce((sum, p) => sum + (p.totalS ?? 0), 0);
  }

  public get userIDs() {
    return Array.from(new Set(
      this.pageArr.reduce((arr, page) => arr.concat(page.userIDs), [] as number[])
    ));
  }

  getUserTotalSeconds(userID: number): number {
    return this.pageArr.reduce(
      (sum, page) => (page.getUserTotalSeconds(userID) ?? 0) + sum,
      0
    );
  }
}
