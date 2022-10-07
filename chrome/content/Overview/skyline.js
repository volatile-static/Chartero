const readingHistory = new HistoryLibrary();
const monthStrings = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];
const now = new Date(); // 最后一个格子
const firstDay = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - now.getDay() - 364
); // 第一个格子
const colorMin = {
    r: 0x0E,
    g: 0x44,
    b: 0x29
};
const colorMax = {
    r: 0x39,
    g: 0xD3,
    b: 0x53
};

function getDate(i, j) { // 根据坐标推算日期
    const date = new Date(firstDay);
    date.setDate(firstDay.getDate() + i * 7 + j);
    return date;
}

function forEachBlock(fun) { // 遍历每个格子
    const result = new Array();
    for (let i = 0; i < 53; ++i)
        for (let j = 0; j <= (i < 52 ? 6 : now.getDay()); ++j)
            result.push(fun(i, j));
    return result;
}

function normalize(max, min, val) {
    return (val - min) / (max - min);
}

function denormalize(max, min, per) {
    return (max - min) * per + min;
}

function getColor(per) { // 计算rgb中的一种颜色
    function convert(integer) {
        const str = parseInt(integer).toString(16);
        return str.length == 1 ? '0' + str : str;
    }
    const r = denormalize(colorMin.r, colorMax.r, per);
    const g = denormalize(colorMin.g, colorMax.g, per);
    const b = denormalize(colorMin.b, colorMax.b, per);
    return '#' + convert(r) + convert(g) + convert(b);
}

function getTimeStr(s) {
    if (s == 0)
        return '：当天没有阅读';
    let result = '：阅读';
    // 
    if (s)
        result += s + '秒';
    return result;
}

function init() {
    forEachBlock((i, j) => {
    });
}

function setMonthLabel() { // 显示月份标签
    for (let i = 0; i < 13; ++i)
        $(`#month-label-${i}`).text(
            monthStrings[(now.getMonth() + i) % 12]
        );
}

function update() {
    setMonthLabel();
    const arr = forEachBlock((i, j) =>
        readingHistory.getDateTime(getDate(i, j).valueOf())
    ).filter(e => e > 0).sort((l, r) => l - r); // 升序排

    forEachBlock((i, j) => {
        const readingS = readingHistory.getDateTime(
            getDate(i, j).valueOf()
        );
        const block = document.createElement('div');
        block.id = `week-${i}-day-${j}`;
        $('#block-container').append(block);
        $(block).addClass('day-block');

        if (readingS > arr[0]) {
            const per = normalize(arr[arr.length - 1], arr[0], readingS);
            $(block).css('background-color', getColor(1 - per));
        } else
            $(block).css('background-color', '#161b22');
        $(block).click(() => Zotero.Chartero.showMessage(
            getDate(i, j).toLocaleDateString(Zotero.locale) + getTimeStr(readingS),
            'information'
        ));
        $(block).attr('data-tooltip', 
            getDate(i, j).toLocaleDateString() + getTimeStr(readingS));
        $(block).attr('data-flow', 'top');
    });
}

function handler(event) {
    if (!event.data || !event.data.history)
        return;
    readingHistory.mergeJSON(event.data.history);
    update();
}

window.addEventListener('DOMContentLoaded', () => {
    init();
    window.addEventListener('message', handler, false);
});
