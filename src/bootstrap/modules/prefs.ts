import type { TagElementProps } from 'zotero-plugin-toolkit/dist/tools/ui';
import { mergeLegacyHistory } from './history';

export default function prefsPaneDoc() {
    function onJsonInput(e: Event) {
        ((e.target as XUL.Element).nextElementSibling as XUL.Button).disabled =
            false;
    }
    function onMergeClick(e: MouseEvent) {
        const btn = e.target as XUL.Button,
            txt = btn.previousElementSibling as HTMLTextAreaElement,
            str = txt.value;
        btn.disabled = true;
        try {
            mergeLegacyHistory(JSON.parse(str));
        } catch (error) {
            window.alert(error);
        }
    }
    return {
        tag: 'vbox',
        classList: ['main-section'],
        children: [
            {
                tag: 'h1',
                properties: {
                    innerText: toolkit.locale.prefs.storageTitle,
                },
            },
            {
                tag: 'textarea',
                attributes: {
                    placeholder: toolkit.locale.prefs.textAreaPlaceholder,
                },
                styles: { resize: 'vertical' },
                listeners: [{ type: 'input', listener: onJsonInput }],
            },
            {
                tag: 'button',
                namespace: 'xul',
                id: 'chartero-preferences-pane-history-import-area',
                attributes: {
                    label: toolkit.locale.prefs.importHistory,
                    native: true,
                },
                listeners: [{ type: 'command', listener: onMergeClick }],
            },
        ],
    } as TagElementProps;
}
