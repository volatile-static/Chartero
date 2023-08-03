declare const addon: import('../bootstrap/addon').default;
declare namespace React {
    interface HTMLAttributes<T> extends AriaAttributes, DOMAttributes<T> {
        class?: string;
    }
}
