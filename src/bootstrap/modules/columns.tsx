import { config } from '../../../package.json';
import HistoryAnalyzer from './history/analyzer';
import { toTimeString } from './utils';

const React = window.React;

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
        zoteroPersist: ['width'],
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
            return addon.ui.createElement(document, 'span', {
                properties: { textContent: toTimeString(data) },
                classList: ['cell', ...column.className.split(' ')],
                enableElementDOMLog: false,
            });
        },
    });
}
