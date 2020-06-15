import * as moment from 'moment';
import * as d3 from 'd3';

export interface YAxisInfo {
  id: string;
  type: 'linear';
  position: 'left' | 'right';
  display: boolean;
  ticks: {
    steps?: number,
    stepValue?: number,
    min: number,
    max: number
  };
  scaleLabel: {
    display: boolean,
    labelString: string
  };
}

export interface Unit {
  label: string;
  multiplier?: number;
  type?: string;
}

export interface ChartSeries {
  data: Array<ChartDatum>;
  chartType: 'bar' | 'line';
  label: string;
  unit: Unit;
  hidden?: boolean;
  color?: string;
  smoothStyle?: boolean;
  showCircles?: boolean;
  showDataGaps?: boolean;
  d3ChartInstance?: D3ChartType;
}

export interface ChartDatum {
  x: number | moment.Moment;
  y: number;
}

export type XDomainType = 'time' | 'number';

export interface AxisDomain<T> {
  max: T;
  min: T;
}

export interface ChartConfig {
  showLegend: boolean;
  showTimeline: boolean;
  // Add custom color array in hex format #RRGGBB
  customColors?: Array<string>;
}

export interface D3ChartType {
  update: Function;
  updateFocus: Function;
  xScale: d3.ScaleTime<number, number> | d3.ScaleLinear<number, number>;
  yScale: d3.ScaleLinear<number, number>;
  readonly color: string;
  readonly label: string;
  readonly parentSelector: any;
  readonly smoothStyle: boolean;
  scaleBandX?: d3.ScaleBand<string>;
}

export const PROBES_GRAPH_YAXIS_INFO: Record<string, YAxisInfo> = {
  'tc': {
    id: 'tc',
    type: 'linear',
    position: 'left',
    display: true,
    ticks: {
      steps: 3,
      stepValue: 10,
      min: 0,
      max: 30
    },
    scaleLabel: {
      display: true,
      labelString: '°C',
    }
  },
  'co': {
    id: 'co',
    type: 'linear',
    position: 'right',
    display: true,
    ticks: {
      min: 300,
      max: 2000
    },
    scaleLabel: {
      display: true,
      labelString: 'ppm',
    }
  },
  'rh': {
    id: 'rh',
    type: 'linear',
    position: 'right',
    display: true,
    ticks: {
      min: 0,
      max: 100
    },
    scaleLabel: {
      display: true,
      labelString: '%',
    }
  }
};

export const TRANSITION_DURATION = 250;
