import { config } from '../../../package.json';
import HistoryAnalyzer from './history/analyzer';
import { AttachmentHistory } from './history/history';
import { toTimeString } from './utils';

export default function addItemColumns() {
    Zotero.ItemTreeManager.registerColumns([
        {
            dataKey: 'totalSeconds',
            label: addon.locale.totalTime,
            iconPath: 'chrome://zotero/skin/tick.png',
            columnPickerSubMenu: true,
            pluginID: config.addonID,
            dataProvider: (item: Zotero.Item) => {
                try {
                    if (!addon.history.cacheLoaded)
                        return '';
                    let his = [addon.history.getByAttachment(item)];
                    if (!his[0])
                        if (item.isRegularItem())
                            his = addon.history.getInTopLevelSync(item);
                        else
                            return '';
                    return toTimeString(
                        new HistoryAnalyzer(his as AttachmentHistory[]).totalS
                    );
                } catch (e) {
                    addon.log(e);
                    return '';
                }
            }
        }
    ]);
}
