# Chartero [![Codacy Badge](https://app.codacy.com/project/badge/Grade/e9a03b20fb90462180218819b41eb34d)](https://www.codacy.com/gh/volatile-static/Chartero/dashboard?utm_source=github.com&utm_medium=referral&utm_content=volatile-static/Chartero&utm_campaign=Badge_Grade) ![Downloads release](https://img.shields.io/github/downloads/volatile-static/Chartero/total?color=green) ![Downloads latest release](https://img.shields.io/github/downloads/volatile-static/Chartero/latest/total?color=green)
[English](../README.md) | 简体中文
## 简介
文档待完善……
## 使用指南
- 更新后请先前往首选项页面导入旧版历史数据后再使用！！！
### 旧版数据迁移
新版本记录格式采用note与附件一、一对应的形式。若当前电脑使用过旧版chartero，则可在*首选项->存储*中点击“自动搜索并导入旧版数据”按钮，否则需要手动复制旧版json数据到文本框中再点击“导入粘贴的历史记录”按钮。**导入时会覆盖已有的新版记录。**

## 开发指南

-   [![Using Zotero Plugin Template](https://img.shields.io/badge/Using-Zotero%20Plugin%20Template-blue?style=flat-square&logo=github)](https://github.com/windingwind/zotero-plugin-template)

-   图表采用[![GitHub package.json dependency version (subfolder of monorepo)](https://img.shields.io/github/package-json/dependency-version/volatile-static/Chartero/highcharts?logo=npm)](https://www.npmjs.com/package/highcharts)生成
-   欲参考纯 JavaScript 版本请[切换分支](https://gitee.com/const_volatile/chartero/tree/js_overlay/)


### 目录结构

-   [addon](../addon/)：存放插件所需的资源文件，详见模板
-   [tools](../tools/)：存放开发环境所需的脚本文件等
-   src
    -   [src/bootstrap](../src/bootstrap/)：引导插件启动的代码
        -   [src/bootstrap/modules](../src/bootstrap/modules/)：各个功能模块的实现细节
    -   [src/vue](../src/vue/)：使用 Vue 的 iframe 页面
        -   [src/vue/summary](../src/vue/summary/)：分类统计（在文件夹的侧边栏）
        -   [src/vue/dashboard](../src/vue/dashboard/)：仪表盘（在普通条目的侧边栏）
        -   [src/vue/overview](../src/vue/overview/)：文库概览（单独标签页）

### 全局变量
与其他插件不同，Chartero没有在全局Zotero变量下定义任何对象，插件对外完全不可访问。

在*src/bootstrap*与*src/vue*中各有一个 global.d.ts 文件，定义了该目录下可访问的全局变量。
由[zotero-types](https://github.com/windingwind/zotero-types)定义的`Zotero`等变量在 Vue 中**未定义**。
`addon`是整个插件内部的“全局”变量，定义在 SandBox 中，插件外不可访问。新建 iframe 时通过`contentWindow`将其传入 Vue。

### 开发环境

[package.json](../package.json)中定义了构建项目所需的 npm 脚本，在 vscode 的调试面板中选择`restart-all`即可全部编译并运行 Zotero。
