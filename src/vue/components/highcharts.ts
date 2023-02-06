import * as Highcharts from 'highcharts';
import HighchartsMore from 'highcharts/highcharts-more';
HighchartsMore(Highcharts);
import HighchartsGantt from 'highcharts/modules/gantt';
HighchartsGantt(Highcharts);
import HighchartsExporting from 'highcharts/modules/exporting';
HighchartsExporting(Highcharts);
import HC_offlineExporting from 'highcharts/modules/offline-exporting';
HC_offlineExporting(Highcharts);
import HC_dark from 'highcharts/themes/dark-unica';
HC_dark(Highcharts);
import { copySVG2JPG, saveSVG, showMessage } from '../../bootstrap/modules/utils';
import * as zh_CN from './zh_CN.json'

if (toolkit.getGlobal('Zotero').locale == 'zh-CN' || toolkit.getGlobal('Zotero').locale == 'ja-JP')
    Highcharts.setOptions(zh_CN as Highcharts.Options);

Highcharts.setOptions({
    time: {
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        useUTC: false
    },
    chart: {
        borderRadius: 6,
        animation: {
            duration: 1500,
            easing: (pos: number) => {
                if ((pos) < (1 / 2.75))
                    return (7.5625 * pos * pos);
                if (pos < (2 / 2.75))
                    return (7.5625 * (pos -= (1.5 / 2.75)) * pos + 0.75);
                if (pos < (2.5 / 2.75))
                    return (7.5625 * (pos -= (2.25 / 2.75)) * pos + 0.9375);
                return (7.5625 * (pos -= (2.625 / 2.75)) * pos + 0.984375);
            }
        },
        style: { fontFamily: '' }
    },
    plotOptions: {
        series: { shadow: true }
    },
    exporting: {
        menuItemDefinitions: {
            downloadSVG: {
                onclick: function () {
                    saveSVG(this.getSVGForExport());
                }
            },
            downloadJPEG: {
                onclick: function () {
                    copySVG2JPG(this.getSVGForExport());
                    showMessage(toolkit.locale.imageCopied, 'information');
                },
                text: toolkit.locale.copyPNG
            }
        },
        buttons: {
            contextButton: {
                menuItems: ['viewFullscreen', 'downloadSVG', 'downloadJPEG']
            }
        }
    },
    credits: { enabled: false }
});

export default Highcharts;