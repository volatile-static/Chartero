# Chartero
## 简介
记录Zotero内置阅读器的浏览历史并通过各种图形呈现出来，方便读者对过去一段时间内学习过程的复盘与回顾。
## 使用说明
### 首选项参数
- 扫描周期：阅读时记录页码的时间间隔，推荐1秒
- 保存周期：保存历史数据的时间间隔，过小会导致卡顿
### 仪表盘
选择文献条目后，右侧边栏将出现“仪表盘”选项卡。
若该条目存在历史记录，则展示阅读进度与各页面的阅读时间。
### 数据存储位置
浏览历史的原始数据以JSON格式保存在一条笔记条目中，
你可以移动他，但不要更改笔记的内容。
> 当Chartero无法自动识别到该条目时，请手动获取笔记的ID并保存至
[C盘的Zotero首选项](https://www.zotero.org/support/kb/profile_directory)中。
## 教程或文档
1. [插件安装](https://zotero-chinese.feishu.cn/wiki/wikcnWTc9848uF9rPMvYTx4yGkb) 
2. [插件开发](https://zotero-chinese.feishu.cn/wiki/wikcn2498hSjibbd4vDRre5pPmQ)
## 隐私
您的浏览历史将以**明文**形式存储在一个笔记条目中，并可随Zotero数据库同步至云端，
但Chartero插件本身不存在任何访问网络的行为。
## TODO
### bugs
1. 切换任何条目时，仪表盘始终被加载
2. 笔记里原有的数据会覆盖第一次保存前的数据（[setReadingData](./chrome/content/chartero.js)）
3. 改变侧边栏大小时图表不能正确调整（受信息标签影响）
4. 图表的保存按钮横向排列
### features
1. 超过一定时间无操作后停止记录
2. 对一个条目画出随日期变化的阅读时长
3. 不同标签的条目数与阅读时长饼图
4. 文件库的甘特图
5. 文件库阅读时长top10
6. tree显示原始数据
## 参与贡献
> *欢迎PR！*
### 软件架构
- 本插件采用纯js编写，无需搭建任何开发环境
- 使用开源脚本[HighCharts](https://www.highcharts.com.cn/)进行各种图表的绘制
- 采用了[jQuery](https://jquery.com/)库简化代码
### 常用调试代码
- 获取当前选择的条目：
```js
const items = ZoteroPane.getSelectedItems();
```
- 根据当前打开的标签页获取阅读器对象:
```js
Zotero.Reader.getByTabID(Zotero_Tabs.selectedID);
```
- 动态添加阅读器侧边栏的选项卡：
```js
const cont = document.getElementById(`${Zotero_Tabs.selectedID}-context`);
const box = cont.querySelector("tabbox");
box.tabs.append(tab);
box.tabpanels.append(panel);
```
- 修改条目类型：
```js
var item = new Zotero.Item('computerProgram');
item.setType(Zotero.ItemTypes.getID('note'));
```
- jQuery元素动画 
```js
$("#reading-progress").animate({value:p});
```
