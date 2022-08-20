Zotero.Chartero = new function () {
    // Default values

    /**
     * Initiate addon
     */
    this.init = async function () {

        Zotero.log("Init Chartero ...");
        // 图表配置
        var options = {
            chart: {
                type: 'bar'                          //指定图表的类型，默认是折线图（line）
            },
            title: {
                text: '我的第一个图表'                 // 标题
            },
            xAxis: {
                categories: ['苹果', '香蕉', '橙子']   // x 轴分类
            },
            yAxis: {
                title: {
                    text: '吃水果个数'                // y 轴标题
                }
            },
            series: [{                              // 数据列
                name: '小明',                        // 数据列名
                data: [1, 0, 4]                     // 数据
            }, {
                name: '小红',
                data: [5, 7, 3]
            }]
        };
        // 图表初始化函数
        Zotero.log(document.getElementById("container62"));
        var chart = Highcharts.chart('container62', options);
        Zotero.log(chart);
    };

    /**
     * Initiate Jasminum preferences
     */
    this.initPref = function () {
        if (Zotero.Prefs.get("jasminum.pdftkpath") === undefined) {
            var pdftkpath = "C:\\Program Files (x86)\\PDFtk Server\\bin";
            if (Zotero.isLinux) {
                pdftkpath = "/usr/bin";
            } else if (Zotero.isMac) {
                pdftkpath = "/opt/pdflabs/pdftk/bin";
            }
            Zotero.Prefs.set("jasminum.pdftkpath", pdftkpath);
        }
        if (Zotero.Prefs.get("jasminum.autoupdate") === undefined) {
            Zotero.Prefs.set("jasminum.autoupdate", false);
        }
        if (Zotero.Prefs.get("jasminum.namepatent") === undefined) {
            Zotero.Prefs.set("jasminum.namepatent", "{%t}_{%g}");
        }
        if (Zotero.Prefs.get("jasminum.zhnamesplit") === undefined) {
            Zotero.Prefs.set("jasminum.zhnamesplit", true);
        }
        if (Zotero.Prefs.get("jasminum.rename") === undefined) {
            Zotero.Prefs.set("jasminum.rename", true);
        }
        if (Zotero.Prefs.get("jasminum.autobookmark") === undefined) {
            Zotero.Prefs.set("jasminum.autobookmark", true);
        }
        if (Zotero.Prefs.get("jasminum.autolanguage") === undefined) {
            Zotero.Prefs.set("jasminum.autolanguage", false);
        }
        if (Zotero.Prefs.get("jasminum.language") === undefined) {
            Zotero.Prefs.set("jasminum.language", 'zh-CN');
        }
        if (Zotero.Prefs.get("jasminum.foreignlanguage") === undefined) {
            Zotero.Prefs.set("jasminum.foreignlanguage", 'en-US');
        }
        if (Zotero.Prefs.get("jasminum.attachment") === undefined) {
            Zotero.Prefs.set("jasminum.attachment", 'pdf');
        }
        if (Zotero.Prefs.get("jasminum.citefield") === undefined) {
            Zotero.Prefs.set("jasminum.citefield", 'extra');
        }
    };
}
