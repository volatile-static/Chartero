# chartero

#### 介绍
Zotero PDF reading chart

#### 软件架构
软件架构说明


#### 安装教程

1.  xxxx
2.  xxxx
3.  xxxx

#### 使用说明

1.  xxxx
2.  xxxx
3.  xxxx

#### 参与贡献

1.  Fork 本仓库
2.  新建 Feat_xxx 分支
3.  提交代码
4.  新建 Pull Request

```js
const cont = document.getElementById(`${Zotero_Tabs.selectedID}-context`);
const box = cont.querySelector("tabbox");
const tab = document.createElement('tab');
tab.setAttribute('label', "555");
box.tabs.append(tab);
const panel = document.createElement('tabpanel');
panel.setAttribute('flex', '1');
panel.className = 'zotero-editpane-item-box';
box.tabpanels.append(panel);

notifierCallback = {
    notify: async function (event, type, ids, extraData) {
        Zotero.log("777777777777777777777777777777777777777777777");
    },
}
Zotero.Notifier.registerObserver(notifierCallback, ["item"])



        const path = await item.getFilePathAsync();
        const pdfDoc = await pdfjsLib.getDocument({
            url: "F:\\a.pdf",
            cMapUrl: "resource://zotero/pdf-reader/cmaps/",
            cMapPacked: true,
        }).promise;
```