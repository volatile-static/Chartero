import React from "../modules/dummy/react";
import ReactDOM from "../modules/dummy/reactdom";
import Highcharts from "../modules/highcharts";
import HighchartsReact from 'highcharts-react-official';
import networkOptions from "../charts/network";
import Tilt from 'react-parallax-tilt';
import { Button } from 'antd';

const App: React.FC = (props: HighchartsReact.Props) => {
    const chartComponentRef = React.useRef<HighchartsReact.RefObject>(null);
    const innerStyle:React.CSSProperties={
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        transform: 'translateZ(90px)',
    },outterStyle:React.CSSProperties={
        display: 'flex',
        'flexDirection': 'column',
        'justifyContent': 'center',
        'alignItems': 'center',
        width: '800px',
        height: '500px',
        'backgroundColor': '#505053',
        color: 'white',
        border: '5px solid black',
        'borderRadius': '20px',
        'marginLeft': '200px',
        'transformStyle': 'preserve-3d',
    } ;
    function onClk(params:any) {
        toolkit.log(params);
        
    }
    return (
        <div>
            <Button type="primary" onClick={onClk}>Primary Button</Button>
            <Tilt
                style={{
                    backgroundColor:'#505053',
        width: '800px',
        height: '500px',
        'borderRadius': '20px',
        'marginLeft': '200px',
        border: '5px solid black',
                    transformStyle:'preserve-3d'
                }}
                tiltReverse={true}
                perspective={500}
                glareEnable={true}
                glareMaxOpacity={0.45}
                scale={1.02}
            >
                <div style={{transform: 'translateZ(20px)'}}>
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

export default function RenderOverview(root: HTMLDivElement) {
    try {
        // const p = ReactDOM.createPortal(<App />, root);
        // toolkit.log(p);
        ReactDOM.render(<App />, root);
    } catch (error) {
        toolkit.log(error);
    }
}
// function IFrame({ children }) {
//     const [ref, setRef] = React.useState();
//     const container = ref?.contentDocument?.body;
//        const c= container && ReactDOM.createPortal(children, container);
//     toolkit.log(container,c);
  
//     return (<div>{c}
//       <iframe title="iframe" ref={setRef}>
        
//       </iframe></div>
//     );
//   }
  
//   function MyComponent() {
//     return (
//       <>
//         <h1>Hello CodeSandbox</h1>
//       </>
//     );
//   }