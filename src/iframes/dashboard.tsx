import React  from "../modules/dummy/react";
import ReactDOM  from "../modules/dummy/reactdom";
import Highcharts from "../modules/dummy/highcharts";
import networkOptions from "../charts/network";

const App = (props: HighchartsReact.Props) => {

  const chartComponentRef = React.useRef<HighchartsReact.RefObject>(null);

  return (
    <HighchartsReact
      highcharts={Highcharts}
      options={networkOptions()}
      ref={chartComponentRef}
      {...props}
    />
  );
};

addEventListener('DOMContentLoaded', (e: Event) => {
  try {
    ReactDOM.render(<App />, document.getElementById('root'));
  } catch (error) {
    console.debug(error);
  }
});
