declare const localeStr: typeof import('../addon/chrome/locale/zh-CN/chartero.json');
declare const toolkit: import('./addon').CharteroToolkit;
declare const rootURI: string;
declare const __dev__: boolean;

declare const HighchartsReact: React.ForwardRefExoticComponent<
  React.PropsWithoutRef<HighchartsReact.Props> &
  React.RefAttributes<HighchartsReact.RefObject>
>;
declare namespace HighchartsReact {
    /**
     * Properties for a HighchartsReact component
     */
    export interface RefObject {
        chart: Highcharts.Chart;

        /**
         * React reference
         */
        container: React.RefObject<HTMLDivElement>;
    }
    export interface Props {
        /* *
         *
         *  Properties
         *
         * */

        /**
         * Indexer for custom properties
         */
        [key: string]: any;

        /**
         * Flag for `Chart.update` call (Default: true)
         */
        allowChartUpdate?: boolean;

        /**
         * Reference to the chart factory (Default: chart)
         */
        constructorType?: keyof typeof Highcharts;

        /**
         * Properties of the chart container
         */
        containerProps?: { [key: string]: any };

        /**
         * Highcharts namespace
         */
        highcharts?: typeof Highcharts;

        /**
         * Immutably recreates the chart on receiving new props
         */
        immutable?: boolean;

        /**
         * Highcharts options
         */
        options?: Highcharts.Options;

        /**
         * Flags for `Chart.update` call: redraw, oneToOne, and animation. (Default:
         * [true, true, true])
         */
        updateArgs?: [boolean] | [boolean, boolean] | [boolean, boolean, boolean];

        /* *
         *
         *  Functions
         *
         * */

        /**
         * Callback for the chart factory
         */
        callback?: Highcharts.ChartCallbackFunction;
    }
}
