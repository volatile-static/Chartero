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
import { copySVG2JPG, saveSVG, showMessage } from './utils';
import * as zh_CN from '../iframes/zh_CN.json'

// window.Zotero = parent.Zotero;
// window.localeStr = JSON.parse(
//     Zotero.File.getContentsFromURL('chrome://chartero/locale/chartero.json')
// );

if (Zotero.locale == 'zh-CN' || Zotero.locale == 'ja-JP')
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
                    //@ts-expect-error
                    saveSVG(this.getSVGForExport());
                }
            },
            downloadJPEG: {
                onclick: function () {
                    //@ts-expect-error
                    copySVG2JPG(this.getSVGForExport());
                    showMessage(localeStr.imageCopied, 'information');
                },
                // text: localeStr.copyPNG
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

// window.Highcharts = Highcharts;
// window.React = parent.React;
// window.ReactDOM = parent.ReactDOM;

// import {
//     forwardRef,
//     memo,
//     useEffect,
//     useImperativeHandle,
//     useLayoutEffect,
//     useRef
// } from 'react';

// React currently throws a warning when using `useLayoutEffect` on the server.
// To get around it, we can conditionally `useEffect` on the server (no-op) and
// `useLayoutEffect` in the browser. We need `useLayoutEffect` to ensure the
// `Highcharts` ref is available in the layout phase. This makes it available
// in a parent component's `componentDidMount`.
// const useIsomorphicLayoutEffect =
//     typeof window !== 'undefined' ? useLayoutEffect : useEffect;

// const HighchartsReact = forwardRef(
//     function HighchartsReact(props: HighchartsReact.Props, ref: HighchartsReact.RefObject) {
//         const containerRef = useRef();
//         const chartRef = useRef();

//         useIsomorphicLayoutEffect(() => {
//             function createChart() {
//                 const H = props.highcharts || (
//                     typeof window === 'object' && window.Highcharts
//                 );
//                 const constructorType = props.constructorType || 'chart';

//                 if (!H) {
//                     console.warn('The "highcharts" property was not passed.');

//                 } else if (!H[constructorType]) {
//                     console.warn(
//                         'The "constructorType" property is incorrect or some ' +
//                         'required module is not imported.'
//                     );
//                 } else if (!props.options) {
//                     console.warn('The "options" property was not passed.');

//                 } else {
//                     // Create a chart
//                     chartRef.current = H[constructorType](
//                         containerRef.current,
//                         props.options,
//                         props.callback ? props.callback : undefined
//                     );
//                 }
//             }

//             if (!chartRef.current) {
//                 createChart();
//             } else {
//                 if (props.allowChartUpdate !== false) {
//                     if (!props.immutable && chartRef.current) {
//                         chartRef.current.update(
//                             props.options,
//                             ...(props.updateArgs || [true, true])
//                         );
//                     } else {
//                         createChart();
//                     }
//                 }
//             }
//         });

//         useIsomorphicLayoutEffect(() => {
//             return () => {
//                 // Destroy chart only if unmounting.
//                 if (chartRef.current) {
//                     chartRef.current.destroy();
//                     chartRef.current = null;
//                 }
//             };
//         }, []);

//         useImperativeHandle(
//             ref,
//             () => ({
//                 get chart() {
//                     return chartRef.current;
//                 },
//                 container: containerRef
//             }),
//             []
//         );

//         // Create container for the chart
//         return <div {...props.containerProps} ref={containerRef} />;
//     }
// );

// window.HighchartsReact = memo(HighchartsReact);
