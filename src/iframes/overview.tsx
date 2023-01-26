import React from "../modules/dummy/react";
import ReactDOM from "../modules/dummy/reactdom";
import Highcharts from "../modules/highcharts";
import HighchartsReact from 'highcharts-react-official';
import networkOptions from "../charts/network";
import Tilt from 'react-parallax-tilt';
import { Button, Transfer } from 'antd';
import type { TransferDirection } from 'antd/es/transfer';

interface RecordType {
    key: string;
    title: string;
    description: string;
    chosen: boolean;
}

const App: React.FC = (props: HighchartsReact.Props) => {
    const [mockData, setMockData] = React.useState<RecordType[]>([]);
    const [targetKeys, setTargetKeys] = React.useState<string[]>([]);
    const chartComponentRef = React.useRef<HighchartsReact.RefObject>(null);
    function onClk(params: any) {
        toolkit.log(params);

    }
    const getMock = () => {
        const tempTargetKeys = [];
        const tempMockData = [];
        for (let i = 0; i < 20; i++) {
            const data = {
                key: i.toString(),
                title: `content${i + 1}`,
                description: `description of content${i + 1}`,
                chosen: i % 2 === 0,
            };
            if (data.chosen) {
                tempTargetKeys.push(data.key);
            }
            tempMockData.push(data);
        }
        setMockData(tempMockData);
        setTargetKeys(tempTargetKeys);
    };

    React.useEffect(() => {
        getMock();
    }, []);

    const filterOption = (inputValue: string, option: RecordType) =>
        option.description.indexOf(inputValue) > -1;

    const handleChange = (newTargetKeys: string[]) => {
        setTargetKeys(newTargetKeys);
    };

    const handleSearch = (dir: TransferDirection, value: string) => {
        console.log('search:', dir, value);
    };
    return (
        <div>
            <Button type="primary" onClick={onClk}>Primary Button</Button>
            <Transfer
                dataSource={mockData}
                showSearch
                filterOption={filterOption}
                targetKeys={targetKeys}
                onChange={handleChange}
                onSearch={handleSearch}
                render={(item) => item.title}
            />
            <Tilt
                style={{
                    display: 'flex',
                    backgroundColor: '#505053',
                    width: '800px',
                    height: '500px',
                    'borderRadius': '20px',
                    'marginLeft': '200px',
                    border: '5px solid black',
                    transformStyle: 'preserve-3d'
                }}
                tiltReverse={true}
                perspective={500}
                glareEnable={true}
                glareMaxOpacity={0.45}
                scale={1.02}
            >
                <div style={{ transform: 'translateZ(20px)' }}>
                    <HighchartsReact
                        highcharts={Highcharts}
                        options={networkOptions()}
                        ref={chartComponentRef}
                        callback={onClk}
                        {...props}
                    />
                </div>
            </Tilt>
        </div>
    );
};

export default function (root: HTMLDivElement) {
    try {
        ReactDOM.render(<App />, root, () => {
            Array.prototype.forEach.call(
                document.querySelector('head')?.children,
                (e: Element) => {
                    toolkit.log(e);
                    root.ownerDocument.documentElement.appendChild(e);
                }
            );
            // toolkit.log(root.ownerDocument.head, par.ownerDocument.querySelector('head'));
        });
    } catch (error) {
        toolkit.log(error);
    }
}
