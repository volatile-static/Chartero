<script lang="ts">
import HistoryAnalyzer from '$/history/analyzer';
import { toTimeString } from '$/utils';
import User from './components/user.vue';

export default {
    components: { User },
    data() {
        return {
            TS: toTimeString,
            allItems: Zotero.Items.getAll(1),
            history: new HistoryAnalyzer(addon.history.getInLibrary()),
            readDates: new Array<Date>(),
            excludedTags: addon.getPref('excludedTags'),
            keywords: {} as Record<number, number[]>,
            keyword: {
                id: 0,
                time: 0,
            },
            favoriteItem: null as Zotero.Item | null,
            favoritePage: 'undefined',
            favoritePageTime: 0,
            favoriteJournal: 'loading...',
            favoriteCreator: 'loading...',
            newItems: new Array<Zotero.Item>(),
            newCount: 'loading...',
            combo: {
                begin: 'loading...',
                end: 'loading...',
                count: 'loading...',
            }
        };
    },
    computed: {
        userName() {
            return Zotero.Users.getCurrentName();
        },
        firstDate() {
            return new Date(this.history.firstTime * 1000).toLocaleDateString(Zotero.locale, {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        },
        itemCount() {
            return this.history.validAttachments.length.toString();
        },
        totalTime() {
            return toTimeString(this.history.totalS);
        },
        overallProgress() {
            return this.history.progress.toString();
        },
        keywordName() {
            return Zotero.Tags.getName(this.keyword.id) || 'undefined';
        },
        keywordTime() {
            return toTimeString(this.keyword.time);
        },
        keywordCount() {
            return this.keywords[this.keyword.id]?.length.toString() || '0';
        },
        favoriteTitle() {
            return (this.favoriteItem?.getField('title') || 'undefined') as string;
        },
        hardMonth() {
            let hardMonth = 0, maxDays = 0;
            for (let month = 0; month < 12; ++month) {
                let count = 0;

                // 遍历stats中的每个键
                for (const date of this.readDates)
                    if (date.getMonth() === month)
                        ++count;
                if (count > maxDays) {
                    hardMonth = month;
                    maxDays = count;
                }
            }
            return String(hardMonth + 1);
        },
    },
    mounted() {
        console.time('mount');
        this.getKeywords();
        this.getFavoriteItem();
        this.getFavoriteAJ();
        this.getAddedItems();
        this.getCombo();
        console.timeEnd('mount');
    },
    methods: {
        getKeywords() {
            for (const it of this.history.parents)
                if (it?.isRegularItem())
                    for (const tag of it.getTags())
                        if (tag.type) {
                            const tagID = Zotero.Tags.getID(tag.tag);
                            if (tagID && !this.excludedTags.includes(tagID)) {
                                this.keywords[tagID] ??= [];
                                this.keywords[tagID].push(it.id);
                            }
                        }
            let id = 0, time = 0;
            for (const tagID in this.keywords)
                for (const itemID of this.keywords[tagID]) {
                    const item = Zotero.Items.get(itemID),
                        his = new HistoryAnalyzer(addon.history.getInTopLevelSync(item)),
                        seconds = his.totalS;
                    if (seconds > time) {
                        id = itemID;
                        time = seconds;
                    }
                }
            this.keyword.id = id;
            this.keyword.time = time;
        },
        getFavoriteItem() {
            let time = 0;
            for (const att of this.history.validAttachments) {
                const his = new HistoryAnalyzer(att),
                    seconds = his.totalS;
                if (seconds > time) {
                    this.favoriteItem = att;
                    time = seconds;
                }
            }
            if (!this.favoriteItem) return;

            const his = addon.history.getByAttachment(this.favoriteItem)!;
            for (const i in his.record.pages) {
                const seconds = his.record.pages[i].totalS ?? 0;
                if (seconds > this.favoritePageTime) {
                    this.favoritePage = i;
                    this.favoritePageTime = seconds;
                }
            }
        },
        async getFavoriteAJ() {  // Author and Journal
            const topLevels = Zotero.Items.keepTopLevel(await this.allItems),
                journalTime: { [name: string]: number } = {},
                authorTime: { [id: number]: number } = {};
            for (const item of topLevels) {
                const journal = item.getField('journalAbbreviation')
                    || item.getField('publicationTitle')
                    || item.getField('conferenceName')
                    || item.getField('proceedingsTitle')
                    || item.getField('university'),
                    totalSeconds = new HistoryAnalyzer(item).totalS,
                    creators: number[] = (item as any)._creatorIDs,
                    updateMap = (map: { [key: number | string]: number }, key: string | number) => {
                        map[key] ??= 0;
                        map[key] += totalSeconds;
                    };
                if (!totalSeconds) continue;

                if (typeof journal == 'string' && journal.length)
                    updateMap(journalTime, journal);
                for (const creator of creators)
                    updateMap(authorTime, creator);
            }

            function getMax(map: { [key: number | string]: number }): string | number {
                let max = 0, maxKey = '';
                for (const key in map)
                    if (map[key] > max) {
                        max = map[key];
                        maxKey = key;
                        addon.log({ max, maxKey });
                    }
                return maxKey;
            }
            const author = Zotero.Creators.get(getMax(authorTime) as number);
            this.favoriteCreator = `${author.firstName ?? ''} ${author.lastName ?? ''}`;
            this.favoriteJournal = getMax(journalTime) as string;
        },
        async getAddedItems() {
            const date = new Date(2023, 0, 1),
                topLevels = Zotero.Items.keepTopLevel(await this.allItems);
            let cnt = 0;
            this.newItems = topLevels.filter(item => new Date(item.dateAdded) > date);
            for (const item of this.newItems) {
                const his = new HistoryAnalyzer(item);
                if (his.ids.length < 1) cnt++;
            }
            this.newCount = cnt.toString();
        },
        getCombo() {
            this.readDates = Object
                .keys(this.history.dateTimeMap)
                .map(date => new Date(date))
                .sort((a, b) => a.getTime() - b.getTime());
            let currCnt = 0,
                maxCnt = 0,
                maxBegin = this.readDates[0],
                maxEnd = this.readDates[0],
                currBegin = this.readDates[0];
            for (let i = 1; i < this.readDates.length; ++i) {
                if (this.readDates[i].getTime() - this.readDates[i - 1].getTime() < 86400001) {
                    ++currCnt;
                    if (currCnt > maxCnt) {
                        maxCnt = currCnt;
                        maxBegin = currBegin;
                        maxEnd = this.readDates[i];
                        addon.log({ maxBegin, maxEnd, maxCnt });
                    }
                } else {
                    currCnt = 0;
                    currBegin = this.readDates[i];
                }
            }
            this.combo.count = maxCnt.toString();
            this.combo.begin = maxBegin.toLocaleDateString(Zotero.locale, {
                month: 'long',
                day: 'numeric'
            });
            this.combo.end = maxEnd.toLocaleDateString(Zotero.locale, {
                month: 'long',
                day: 'numeric'
            });
        },
    }
};
</script>

<template>
  <h1 class="title">
    🌟
    <User :text="userName" />的2023年度总结 🌟
  </h1>
  <ul class="list">
    <li>
      <User :text="firstDate" />这一天，你安装了Chartero，命运的齿轮开始转动……
    </li>
    <li>
      在2023年，你用
      <User :text="totalTime" />阅读了
      <User :text="itemCount" />篇文献，读完了文库中
      <User :text="overallProgress" />%的页面，再接再厉！
    </li>
    <li>
      你的年度关键词是：
      <User :text="keywordName" />，你花了
      <User :text="keywordTime" />阅读其中的
      <User :text="keywordCount" />篇文献。
    </li>
    <li>
      今年你最爱看的文献是：
      <User :text="favoriteTitle" />，其中第
      <User :text="favoritePage" />页你读了
      <User :text="TS(favoritePageTime)" />，还记得吗？
    </li>
    <li>
      你最爱看的期刊是
      <User :text="favoriteJournal" />，最关注的作者是
      <User :text="favoriteCreator" />。祝你2024年多发
      <User :text="favoriteJournal" />！
    </li>
    <li>
      过去的一年里，你在Zotero中添加了
      <User :text="newItems.length.toString()" />篇文献，其中有
      <User :text="newCount" />篇你还没有打开过，加油呀~
    </li>
    <li>
      2023年的
      <User :text="hardMonth" />
      月是你阅读天数最多的月份。你从
      <User :text="combo.begin" />到
      <User :text="combo.end" />连续阅读了
      <User :text="combo.count" />天，真是太棒了！
    </li>
  </ul>
</template>

<style scoped>
.title {
    text-align: center;
    /* 将标题居中 */
    font-size: 2em;
    /* 设置标题字体大小 */
    padding: 20px;
    /* 设置标题内边距 */
}

.list {
    border: thin solid #007bff;
    border-radius: 5px;
    padding: 10px;
    margin: 10px;
    background-color: #f2f2f2;
    box-shadow: 9px 9px 16px rgb(163, 177, 198, 0.6),
        -9px -9px 16px rgba(255, 255, 255, 0.5);
}

.list li {
    margin: 8px 16px;
}
</style>
