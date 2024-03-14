import { config } from '../../../package.json';
import HistoryAnalyzer from './history/analyzer';
import { toTimeString, getGlobal } from './utils';

const React = getGlobal('React');

export default function addItemColumns() {
    Zotero.ItemTreeManager.registerColumns({
        dataKey: 'totalSeconds',
        label: addon.locale.totalTime,
        iconLabel: (
            <>
                <span
                    className="icon icon-bg"
                    style={{
                        backgroundImage: `url(
                        chrome://${config.addonName}/content/icons/icon.svg
                    )`,
                    }}
                />
                &nbsp;
                <span>{addon.locale.totalTime}</span>
            </>
        ),
        columnPickerSubMenu: true,
        pluginID: config.addonID,
        disabledIn: ['feed', 'feeds'],
        zoteroPersist: ['width', 'hidden', 'sortDirection'],
        minWidth: 24,
        dataProvider: (item: Zotero.Item) => {
            try {
                if (!addon.history.cacheLoaded) return '';
                return new HistoryAnalyzer(item).totalS.toString();
            } catch (e) {
                addon.log(e);
                return '';
            }
        },
        renderCell: (_, data, column) => {
            const doc = Zotero.getMainWindow().document;
            return addon.ui.createElement(doc, 'span', {
                properties: { textContent: toTimeString(data) },
                classList: ['cell', ...column.className.split(' ')],
                enableElementDOMLog: false,
                enableElementRecord: false,
            });
        },
    });
}
