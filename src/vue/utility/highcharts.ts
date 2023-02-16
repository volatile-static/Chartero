import * as Highcharts from 'highcharts';
import HighchartsMore from 'highcharts/highcharts-more';
HighchartsMore(Highcharts);
import HighchartsGantt from 'highcharts/modules/gantt';
HighchartsGantt(Highcharts);
import NetworkGraph from 'highcharts/modules/networkgraph';
NetworkGraph(Highcharts);
import HighchartsExporting from 'highcharts/modules/exporting';
HighchartsExporting(Highcharts);
import {
    copySVG2JPG,
    saveSVG,
    showMessage,
} from '../../bootstrap/modules/utils';
import { viewItemsInLib } from './utils';
import * as zh_CN from './zh_CN.json';

if (
    toolkit.getGlobal('Zotero').locale == 'zh-CN' ||
    toolkit.getGlobal('Zotero').locale == 'ja-JP'
)
    Highcharts.setOptions(zh_CN as Highcharts.Options);

Highcharts.setOptions({
    time: {
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        useUTC: false,
    },
    title: { text: undefined },
    tooltip: { outside: true },
    chart: {
        borderRadius: 6,
        animation: {
            duration: 1200,
            easing: (pos: number) => {
                if (pos < 1 / 2.75) return 7.5625 * pos * pos;
                if (pos < 2 / 2.75)
                    return 7.5625 * (pos -= 1.5 / 2.75) * pos + 0.75;
                if (pos < 2.5 / 2.75)
                    return 7.5625 * (pos -= 2.25 / 2.75) * pos + 0.9375;
                return 7.5625 * (pos -= 2.625 / 2.75) * pos + 0.984375;
            },
        },
        style: { fontFamily: '' },
    },
    plotOptions: {
        series: {
            allowPointSelect: true,
            cursor: 'pointer',
            shadow: true,
        },
    },
    exporting: {
        menuItemDefinitions: {
            downloadSVG: {
                onclick: function () {
                    saveSVG((this as any).getSVGForExport());
                },
            },
            downloadJPEG: {
                onclick: function () {
                    copySVG2JPG((this as any).getSVGForExport());
                    showMessage(toolkit.locale.imageCopied, 'information');
                },
                text: toolkit.locale.copyPNG,
            },
            showInLibrary: {
                onclick: function () {
                    const points = this.getSelectedPoints(),
                        ids = points
                            .map((p: any) => p.id)
                            .filter(id => typeof id == 'number');
                    if (ids.length > 0) viewItemsInLib(ids);
                },
                text: toolkit.locale.showSelectedInLibrary,
            },
        },
        buttons: {
            contextButton: {
                menuItems: [
                    'viewFullscreen',
                    'downloadSVG',
                    'downloadJPEG',
                    'showInLibrary',
                ],
            },
        },
    },
    credits: { enabled: false },
} as Highcharts.Options);

export default Highcharts;
