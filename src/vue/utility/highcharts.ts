import * as Highcharts from 'highcharts';
import HighchartsMore from 'highcharts/highcharts-more';
HighchartsMore(Highcharts);
import HighchartsGantt from 'highcharts/modules/gantt';
HighchartsGantt(Highcharts);
import NetworkGraph from 'highcharts/modules/networkgraph';
NetworkGraph(Highcharts);
import WordCloudGraph from 'highcharts/modules/wordcloud';
WordCloudGraph(Highcharts);
import VariablePieGraph from 'highcharts/modules/variable-pie';
VariablePieGraph(Highcharts);
import MarkerCluster from 'highcharts/modules/marker-clusters';
MarkerCluster(Highcharts);
import HighchartsColorAxis from 'highcharts/modules/coloraxis';
HighchartsColorAxis(Highcharts);
import HighchartsExporting from 'highcharts/modules/exporting';
HighchartsExporting(Highcharts);
import HighchartsExportData from 'highcharts/modules/export-data';
HighchartsExportData(Highcharts);
import NoDataToDisplay from 'highcharts/modules/no-data-to-display';
NoDataToDisplay(Highcharts);
// import MouseWheelZoom from 'highcharts/modules/mouse-wheel-zoom';
// MouseWheelZoom(Highcharts);
import { copySVG2JPG, saveSVG } from '../../bootstrap/modules/utils';
import { viewItemsInLib } from './utils';
import * as zh_CN from './zh_CN.json';
import { MessagePlugin } from 'tdesign-vue-next';

let infoFlag = false;
if (
    addon.getGlobal('Zotero').locale == 'zh-CN' ||
    addon.getGlobal('Zotero').locale == 'ja-JP'
)
    Highcharts.setOptions(zh_CN as Highcharts.Options);
Highcharts.setOptions({
    accessibility: { enabled: false },
    time: {
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        useUTC: false,
    },
    title: { text: undefined },
    // tooltip: { outside: true },
    chart: {
        displayErrors: true,
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
        panKey: 'shift',
        panning: { type: 'x', enabled: true },
        zooming: {
            type: 'x',
            // key: 'ctrl',
            // mouseWheel: { enabled: true },
        },
        events: {
            selection: _ => {
                if (!infoFlag) {
                    MessagePlugin.info(addon.locale.zoomingTip);
                    infoFlag = true;
                }
            },
        },
    },
    plotOptions: {
        series: {
            allowPointSelect: true,
            cursor: 'pointer',
            shadow: true,
            point: { events: { select: _ => addon.log(_) } },
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
                    MessagePlugin.success(addon.locale.imageCopied);
                },
                text: addon.locale.copyPNG,
            },
            showInLibrary: {
                onclick: function () {
                    const points = this.getSelectedPoints(),
                        ids = points
                            .map((p: any) => p.custom?.itemID ?? p.id)
                            .filter(id => parseInt(id) >= 0);
                    if (ids.length > 0) viewItemsInLib(ids);
                    else MessagePlugin.warning(addon.locale.noItemToView);
                },
                text: addon.locale.showSelectedInLibrary,
            },
            help: { text: addon.locale.help },
        },
        buttons: {
            contextButton: {
                menuItems: [
                    'viewFullscreen',
                    'downloadSVG',
                    'downloadJPEG',
                    'showInLibrary',
                    'help',
                ],
            },
        },
    },
    credits: { enabled: false },
} as Highcharts.Options);

export default Highcharts;
