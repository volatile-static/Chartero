import { config } from '../../../package.json';
import HistoryAnalyzer from './history/analyzer';
import { toTimeString } from './utils';

export default function addItemColumns() {
    Zotero.ItemTreeManager.registerColumns([
        {
            dataKey: 'totalSeconds',
            label: addon.locale.totalTime,
            // iconPath: `chrome://${config.addonName}/content/icons/icon.png`,
            columnPickerSubMenu: true,
            pluginID: config.addonID,
            dataProvider: (item: Zotero.Item) => {
                try {
                    if (!addon.history.cacheLoaded)
                        return '';
                    return new HistoryAnalyzer(item).totalS.toString();
                } catch (e) {
                    addon.log(e);
                    return '';
                }
            },
            renderCell: (_, data, column) => {
                return addon.ui.createElement(document, 'span', {
                    properties: { textContent: toTimeString(data) },
                    classList: ['cell', ...column.className.split(' ')],
                    enableElementDOMLog: false
                });
            }
        }
    ]);
}
