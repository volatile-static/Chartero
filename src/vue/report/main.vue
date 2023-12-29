<script lang="ts">
import HistoryAnalyzer from '$/history/analyzer';
import { toTimeString } from '$/utils';
import User from './components/user.vue';

export default {
    mounted() {
        console.time('mount');
        this.mapKeywords();
        this.getFavoriteItem();
        this.getAddedItems();
        console.timeEnd('mount');
    },
    data() {
        return {
            TS: toTimeString,
            theme: addon.getPref('useDarkTheme') ? 'dark' : 'light',
            history: new HistoryAnalyzer(addon.history.getInLibrary()),
            excludedTags: addon.getPref('excludedTags'),
            keywords: {} as Record<number, number[]>,
            keyword: {
                id: 0,
                time: 0,
            },
            favoriteItem: null as Zotero.Item | null,
            favoritePage: 'undefined',
            favoritePageTime: 0,
            newItems: new Array<Zotero.Item>(),
            newCount: 'loading...',
        };
    },
    methods: {
        mapKeywords() {
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
        async getAddedItems() {
            const date = new Date(2023, 0, 1),
                items = await Zotero.Items.getAll(1),
                topLevels = Zotero.Items.keepTopLevel(items);
            let cnt = 0;
            this.newItems = topLevels.filter(item => new Date(item.dateAdded) > date);
            for (const item of this.newItems) {
                // const his = item.isAttachment() 
                //     ? [addon.history.getByAttachment(item)] 
                //     : addon.history.getInTopLevelSync(item);
                // addon.log(his);
                const his = new HistoryAnalyzer(item);
                if (his.ids.length < 1) cnt++;
            }
            this.newCount = cnt.toString();
        }
    },
    computed: {
        userName() {
            return Zotero.Users.getCurrentName();
        },
        firstDate() {
            return new Date(this.history.firstTime * 1000).toLocaleDateString(Zotero.locale);
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
        }
    },
    components: { User }
};
</script>

<template>
    <h1 class="title">
        🎉 <User :text="userName" />的2023年度总结 🎉
    </h1>
    <ul class="list">
        <li>
            🗓️ <User :text="firstDate" />，你安装了Chartero，命运的齿轮开始转动……
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
            过去的一年里，你在Zotero中添加了
            <User :text="newItems.length.toString()" />篇文献，其中有
            <User :text="newCount" />篇你还没有打开过，加油呀~
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

.user {
    color: rgb(17, 149, 48);
    font-weight: bold;
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
