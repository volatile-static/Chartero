import React from "./dummy/react";
import ReactDOM from "./dummy/reactdom";
import { Button, Transfer } from 'antd';
import type { TransferDirection } from 'antd/es/transfer';
import 'antd/dist/reset.css';

export default function (root: HTMLDivElement) {
    ReactDOM.render(<Main />, root);

    function Main() {
        return (
            <div>
                <Button type="primary">Button</Button>
            </div>
        );
    }

}

