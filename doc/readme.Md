# Chartero

## 简介

## User Guide

## Development

-   本插件基于 windingwind 的[插件模板](https://github.com/windingwind/zotero-addon-template)开发
-   图表采用[Highcharts](https://www.npmjs.com/package/highcharts)生成
-   欲参考纯 JavaScript 版本请[切换分支](https://gitee.com/const_volatile/chartero/tree/js_overlay/)

### 目录结构

-   [addon](../addon/)：存放插件所需的资源文件，详见模板
-   [tools](../tools/)：存放开发环境所需的脚本文件等
-   src
    -   [src/bootstrap](../src/bootstrap/)：引导插件启动的代码
    -   [src/vue](../src/vue/)：使用 Vue 的 iframe 页面
        -   [src/vue/components](../src/vue/components/)：公用组件
        -   [src/vue/dashboard](../src/vue/dashboard/)：仪表盘
        -   [src/vue/overview](../src/vue/overview/)：文库概览
