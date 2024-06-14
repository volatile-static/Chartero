/// <reference types="vite/client" />

declare const __test__: boolean;
declare const addon: import('../bootstrap/addon').default;
declare namespace React {
    interface HTMLAttributes<T> extends AriaAttributes, DOMAttributes<T> {
        class?: string;
    }
}

declare namespace global {
    const setTimeout: typeof window.setTimeout;
}
