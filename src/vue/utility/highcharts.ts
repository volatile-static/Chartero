import Highcharts from 'highcharts';
import 'highcharts/highcharts-more';
import 'highcharts/modules/gantt';
import 'highcharts/modules/networkgraph';
import 'highcharts/modules/wordcloud';
import 'highcharts/modules/variable-pie';
import 'highcharts/modules/sankey';
import 'highcharts/modules/solid-gauge';
// import DependencyWheelGraph from 'highcharts/modules/dependency-wheel';
// import MarkerCluster from 'highcharts/modules/marker-clusters';
import 'highcharts/modules/coloraxis';
import 'highcharts/modules/exporting';
import 'highcharts/modules/export-data';
import 'highcharts/modules/no-data-to-display';
import 'highcharts/modules/drilldown';
// import MouseWheelZoom from 'highcharts/modules/mouse-wheel-zoom';

import Dashboards from '@highcharts/dashboards';
import DataGrid from '@highcharts/dashboards/datagrid';
import LayoutModule from '@highcharts/dashboards/modules/layout';
LayoutModule(Dashboards);
Dashboards.HighchartsPlugin.custom.connectHighcharts(Highcharts);
Dashboards.GridPlugin.custom.connectGrid(DataGrid);
Dashboards.PluginHandler.addPlugin(Dashboards.HighchartsPlugin);
Dashboards.PluginHandler.addPlugin(Dashboards.GridPlugin);

import { copySVG2JPG, saveSVG } from '../../bootstrap/modules/utils';
import { viewItemsInLib } from './utils';
import * as zh_CN from './zh_CN.json';
import { MessagePlugin } from 'tdesign-vue-next';

let infoFlag = false;
if (['zh-CN', 'zh-TW', 'ja-JP'].includes(navigator.language))
    Highcharts.setOptions(zh_CN as unknown as Highcharts.Options);
Highcharts.setOptions({
    accessibility: { enabled: false },
    time: {
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        useUTC: false,
    },
    lang: { locale: navigator.language },
    title: { text: undefined },
    // tooltip: { outside: true },
    chart: {
        displayErrors: true,
        borderRadius: 6,
        animation: {
            duration: 1200,
            easing: (pos: number) => {
                if (pos < 1 / 2.75) return 7.5625 * pos * pos;
                if (pos < 2 / 2.75) return 7.5625 * (pos -= 1.5 / 2.75) * pos + 0.75;
                if (pos < 2.5 / 2.75) return 7.5625 * (pos -= 2.25 / 2.75) * pos + 0.9375;
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
            selection: () => {
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
                onclick() {
                    saveSVG((this as any).getSVGForExport());
                },
            },
            downloadJPEG: {
                onclick() {
                    copySVG2JPG((this as any).getSVGForExport());
                    MessagePlugin.success(addon.locale.imageCopied);
                },
                text: addon.locale.copyPNG,
            },
            showInLibrary: {
                onclick() {
                    const points = this.getSelectedPoints(),
                        ids = points
                            .flatMap((p: any) => p.custom?.itemIDs ?? parseInt(p.custom?.itemID ?? p.id))
                            .filter(id => id >= 0);
                    if (ids.length) viewItemsInLib(ids);
                    else MessagePlugin.warning(addon.locale.noItemToView);
                },
                text: addon.locale.showSelectedInLibrary,
            },
            help: { text: addon.locale.help },
        },
        buttons: {
            contextButton: {
                menuItems: ['downloadSVG', 'downloadJPEG', 'showInLibrary', 'help'],
            },
        },
    },
    credits: { enabled: false },
} as Highcharts.Options);

export default Highcharts;
export { Dashboards };
