import { ElementProps } from "zotero-plugin-toolkit/dist/tools/ui";

export default function prefsPaneDoc() {
    // Zotero.Tags.getAll(1)
    return {
        tag: 'groupbox',
        children: [
            {
                tag: 'vbox',
                classList: ['main-section'],
                children: [
                    { tag: 'h1', namespace: 'html', properties: { innerText: localeStr.prefs.scheduleTitle } },
                    {
                        tag: 'groupbox', children: [
                            {
                                tag: 'hbox', classList: ['indented-pref'], attributes: { align: 'center' }, children: [
                                    { tag: 'span', properties: { innerText: localeStr.prefs.scheduleScanPeriod } },
                                    { tag: 'html:input', attributes: { type: 'text' } },
                                    { tag: 'span', properties: { innerText: localeStr.seconds } }
                                ]
                            }, {
                                tag: 'hbox', classList: ['indented-pref'], attributes: { align: 'center' }, children: [
                                    { tag: 'span', properties: { innerText: localeStr.prefs.scheduleSavePeriod } },
                                    { tag: 'html:input', attributes: { type: 'text' } },
                                    { tag: 'span', properties: { innerText: localeStr.seconds } }
                                ]
                            }
                        ]
                    }
                ]
            }, {
                tag: 'vbox',
                classList: ['main-section'],
                children: [
                    { tag: 'h1', namespace: 'html', properties: { innerText: localeStr.prefs.storageTitle } },
                    {
                        tag: 'groupbox', namespace: 'xul', children: [
                            { tag: 'label', children: [{ tag: 'h2', properties: { innerText: 'akakdk' } }] },
                            {
                                tag: 'hbox', attributes: { align: 'center' }, children: [

                                    {
                                        tag: 'button', attributes: { label: 'btn' }, styles: { 'margin-top': 0 }, listeners: [{
                                            type: 'command',
                                            listener: e => toolkit.log(localeStr)
                                        }]
                                    }
                                ]
                            }
                        ]
                    }
                ]
            }, {
                tag: 'vbox',
                classList: ['main-section'],
                children: [
                    { tag: 'h1', properties: { innerText: localeStr.prefs.plotTitle } },
                    {
                        tag: 'checkbox', attributes: { label: 'sss', native: true }, listeners: [{
                            type: 'command',
                            listener: e => window.console.debug(Zotero)
                        }]
                    },
                    {
                        tag: 'menulist', attributes: { native: true }, listeners: [{
                            type: 'command',
                            listener: e => window.alert(1)
                        }], children: [
                            {
                                tag: 'menupopup', children: [
                                    { tag: 'menuitem', attributes: { label: '1', value: 1 } },
                                    { tag: 'menuitem', attributes: { label: '2', value: 1 } },
                                    { tag: 'menuitem', attributes: { label: '3', value: 2 } },
                                    { tag: 'menuitem', attributes: { label: '4', value: 5 } },
                                    { tag: 'menuitem', attributes: { label: '5', value: 7 } },
                                ]
                            }
                        ]
                    }
                ]
            }
        ]
    } as ElementProps & { tag: string }
}
