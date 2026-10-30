// Only what the chart uses, so the bundle stays small on phones.
import { LineChart } from 'echarts/charts';
import { DataZoomSliderComponent, GridComponent, MarkLineComponent, TitleComponent, TooltipComponent } from 'echarts/components';
import { init, use } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';

use([LineChart, GridComponent, TooltipComponent, TitleComponent, DataZoomSliderComponent, MarkLineComponent, CanvasRenderer]);

export { init };
export type { ECharts } from 'echarts/core';
