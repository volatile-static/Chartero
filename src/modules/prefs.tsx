import { Button } from 'antd';
import 'antd/dist/reset.css';

window.CharteroPrefPaneLoad=function() {
    const React = require('react'), ReactDOM = require('react-dom');
    ReactDOM.render(<Main />, document.getElementById('zotero-prefpane-Chartero'));

    function Main() {
        return (
            <div>
                <Button type="primary">Button</Button>
            </div>
        );
    }

}

