import type { ElementProps } from 'zotero-plugin-toolkit/dist/tools/ui';
import { mergeLegacyHistory } from './history';

export default function prefsPaneDoc() {
    return {
        tag: 'groupbox',
        children: [
            {
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
                            placeholder:
                                toolkit.locale.prefs.textAreaPlaceholder,
                        },
                        styles: { resize: 'vertical' },
                    },
                    {
                        tag: 'button',
                        namespace: 'xul',
                        id: 'chartero-preferences-pane-history-import-area',
                        attributes: {
                            label: toolkit.locale.prefs.importHistory,
                            native: true,
                        },
                        listeners: [
                            {
                                type: 'command',
                                listener: e => {
                                    const btn = e.target as XUL.Button,
                                        txt =
                                            btn.previousElementSibling as HTMLTextAreaElement,
                                        str = txt.value;
                                    try {
                                        mergeLegacyHistory(JSON.parse(str));
                                    } catch (error) {
                                        window.alert(error);
                                    }
                                },
                            },
                        ],
                    },
                ],
            },
        ],
    } as ElementProps & { tag: string };
}
