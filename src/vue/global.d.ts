declare const toolkit: import('../bootstrap/addon').CharteroToolkit;
declare namespace React {
    interface HTMLAttributes<T> extends AriaAttributes, DOMAttributes<T> {
        class?: string;
    }
}
