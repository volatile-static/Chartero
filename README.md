<h1 align='center'>Chartero</h1>
<p align='center'>
    <a href="https://app.codacy.com/gh/volatile-static/Chartero/dashboard?utm_source=gh&utm_medium=referral&utm_content=&utm_campaign=Badge_grade">
        <img src="https://app.codacy.com/project/badge/Grade/e9a03b20fb90462180218819b41eb34d" />
    </a>
    <a href='../src/'>
        <img src='https://img.shields.io/github/languages/code-size/volatile-static/Chartero?logo=vuedotjs' alt='code size' />
    </a>
    <a href='https://github.com/volatile-static/Chartero/releases/latest/download/chartero.xpi'>
        <img src='https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fapi.github.com%2Frepos%2Fvolatile-static%2FChartero%2Freleases%2Flatest&query=%24.assets%5B0%5D.size&suffix=%20Bytes&label=XPI&logo=Zotero&logoColor=%23CC2936' alt='xpi size' />
    </a>
    <a href='https://github.com/volatile-static/Chartero/releases'>
        <img src="https://img.shields.io/github/downloads/volatile-static/Chartero/total?logo=github" alt='download' />
    </a>
    <a href='https://github.com/volatile-static/Chartero/releases/latest/'>
        <img src="https://img.shields.io/github/downloads/volatile-static/Chartero/latest/total" alt='latest' />
    </a> 
</p>
<p align='center'>
    <kbd>English</kbd> | <a href='doc/readme.Md'>简体中文</a>
</p>

## Abstract

The name _Chartero_ is a combination of **Char**t and Zo**tero**. As a [Zotero](https://www.zotero.org/) plugin, it can make your library livelier.

## User Guide

<details>
<summary><u>👉 <b>Introduction</b> 👈</u></summary>

|                   Screenshots                   | Features                                                                                                                      |
| :---------------------------------------------: | :---------------------------------------------------------------------------------------------------------------------------- |
|      ![history recording](doc/record.jpg)       | The kernel of `Chartero`. It records page numbers and timestamps when you read.                                               |
|         ![open recent](doc/recent.png)          | In the main menu `File`, you can open the recently read documents.                                                            |
|            ![column](doc/column.png)            | In `items tree` of library view, you can add a column to show reading progress.                                               |
|         ![dashboard](doc/dashboard.jpg)         | Illustrates all information about a `top-level item`. Updating as soon as record changes when in a `Reader`.                  |
|           ![summary](doc/summary.jpg)           | Summary of two or more `items`. _Will not_ be loaded if the number of selected items is larger than you set in preferences.   |
|           ![minimap](doc/minimap.gif)           | Besides the scrollbar of `Reader`(PDF and ePub), gray scale blocks for read pages and color strips for annotations.           |
| ![images](doc/images.png) ![more](doc/more.png) | At the left side-bar of `Reader`, you can see all images in the current document. Click to navigate and double-click to copy. |

</details>

### Troubleshooting

Please disable all other plugins when necessary, and then file an issue with the exported debug output. Feel free to ask anything in issue😁

> [Known Issues](https://github.com/volatile-static/Chartero/issues?q=is%3Aissue+is%3Aopen+label%3Abug)

## Developer Guide

-   [![Using Zotero Plugin Template](https://img.shields.io/badge/Using-Zotero%20Plugin%20Template-blue?style=flat-square&logo=github)](https://github.com/windingwind/zotero-plugin-template)
-   Using [![Highcharts](https://img.shields.io/github/package-json/dependency-version/volatile-static/Chartero/highcharts?logo=npm)](https://www.npmjs.com/package/highcharts) to generate charts
-   [Minimap](src/bootstrap/modules/minimap/) is rendered by [![GitHub package.json dependency version (dev dep on branch)](https://img.shields.io/github/package-json/dependency-version/volatile-static/chartero/dev/%40types%2Freact?logo=npm)](https://17.reactjs.org/)
-   UI components are from [![T-Design](https://img.shields.io/github/package-json/dependency-version/volatile-static/Chartero/tdesign-vue-next?logo=npm)](https://tdesign.tencent.com/vue-next)
-   For legacy Zotero `6` version, please check out [this branch](https://github.com/volatile-static/Chartero/tree/js_overlay).

### Directory Structure

-   [addon](addon): The assets of the plugin, see [template](https://github.com/windingwind/zotero-plugin-template) for details.
-   [tools](tools): Scripts for development.
-   src
    -   [src/bootstrap](src/bootstrap): The entry point of the plugin.
        -   [src/bootstrap/modules](src/bootstrap/modules): Implementation of modules.
    -   [src/vue](src/vue): The `iframe` windows using [Vue](https://v3.vuejs.org/)
        -   [src/vue/summary](src/vue/summary): The summary window.
        -   [src/vue/dashboard](src/vue/dashboard): The dashboard window.

### Preferences

The `config.defaultSettings` field of [package.json](package.json) defines the default values of preferences. The keys will be automatically replaced when compile [addon](addon).

### Locales

All locale strings defined in [locale](addon/locale), which will be loaded dynamically when the plugin starts.

### Development Environment

[package.json](package.json) defines the scripts for building and debugging. When use `build-dev` command, the global variable `__dev__` will be set to `true`, and the plugin switched to the development mode.

### Record Structure

The data structure of history records are defined in [history/data.ts](src/bootstrap/modules/history/data.ts), and the JSON string is like this:

```json
{
    "pages": {
        "0": {
            "p": {
                "1693200000": 6
            }
        }
    },
    "numPages": 27
}
```

### Inter-plugin Compatibility

> This section is for developers who have suspected compatibility issues with `Chartero`.

-   Patched the `search` method of object `Zotero.Search` to hide the note items which records the reading history.
-   Add click events to tabs in the left side-bar of `Reader`.
-   When adding "Overview" tab, `contextPane.js` throws `extraData[ids[0]] is undefined` error, caused by the `type` of this tab is `library`.

## See also

-   [🤩 Awesome Zotero Plugins](https://plugins.zotero-chinese.com/charts.html)

---

<br />
<p align='center'><img src='addon/content/icons/icon32.png' alt='icon' /></p>
