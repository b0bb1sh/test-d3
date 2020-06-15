import { Component, OnInit, OnDestroy, Input, ViewChild, ElementRef } from '@angular/core';
import { Subscription, Observable } from 'rxjs';
import * as d3 from 'd3';
import * as _ from 'lodash';
import * as moment from 'moment';
import { LineSeries } from './LineSeries';
import { BarSeries } from './BarSeries';
import { ChartSeries, AxisDomain, XDomainType, ChartConfig, ChartDatum, Unit, YAxisInfo, PROBES_GRAPH_YAXIS_INFO } from '../public_api';
import { ScaleLinear, ScaleTime } from 'd3';


const WIDTH = 960;
const HEIGHT = 320;
const TEXT_PADDING = 20;


@Component({
  // tslint:disable-next-line: component-selector
  selector: 'b3-chart',
  template: `<svg #chartContainer></svg>
    <div id='tooltip' class='tooltip p-1'></div>
    <!--Add timeline
      <svg *ngIf="showTimeline" #timelineContainer></svg>-->
    <svg #legendContainer class="legendContainer"></svg>`,
  styles: [`
    .legendContainer {
      width: 100%
      padding-left: 1em
      padding-right: 1em
    }
    .tooltip {
      position: absolute
      background-color: #343b40
      color: #eeefef
      border-radius: 3px
      padding: 0.5rem
    }
  `]
})

export class B3ChartComponent implements OnInit, OnDestroy {
  @Input() data$: Observable<Array<ChartSeries>>;
  @Input() xDomain: AxisDomain<any>;
  @Input() xDomainType: XDomainType;
  @Input() interval: number;
  @Input() chartConfig?: ChartConfig = {
    showLegend: true,
    showTimeline: false
  };

  dataSubscription: Subscription;

  @ViewChild('chartContainer') private chartContainerRef: ElementRef;
  @ViewChild('legendContainer') private legendContainerRef: ElementRef;

  private x: d3.ScaleTime<number, number> | d3.ScaleLinear<number, number>;
  private scaleBandX;
  private ys: Record<string, d3.ScaleLinear<number, number>> = {};
  private colors: d3.ScaleOrdinal<string, string>;
  private bisect = d3.bisector((d: ChartDatum) => d.x);
  private width: number;
  private height: number;
  // private filteredData: Record<string, boolean>;
  private chartGroup;
  private yAxesGroup;
  private xAxisGroup;
  private chartContainer: any;
  private legendContainer: any;

  private margin = { top: 10, right: 10, bottom: 35, left: 10 };
  dataGroup: any;
  seriesList: Array<ChartSeries> = new Array();
  tooltip: any;
  tooltipLine: any;

  constructor() { }

  private isDatasetEmpty(dataSet: Array<ChartSeries>): boolean {
    return _.isNil(dataSet) ||
      _.size(dataSet) === 0 ||
      _.every(dataSet, d => _.size(d.data) === 0)
  }

  ngOnInit(): void {
    this.width = WIDTH - this.margin.left - this.margin.right;
    this.height = HEIGHT - this.margin.top - this.margin.bottom;
    this.initSVG();
    this.initColorScale();

    this.dataSubscription = this.data$.subscribe(
      (seriesList: Array<ChartSeries>) => {
        // Check if data exists
        if (this.isDatasetEmpty(seriesList)) {
          // TODO show no data message
          this.dataGroup.selectAll('.series').remove();
          this.legendContainer.selectAll('g.legendItem').remove();
          return;
        }
        _.forEach(seriesList, series => {
          if (!series.hidden) {
            const prevSeries = _.find(this.seriesList, s => s.label === series.label);
            _.set(series, 'hidden', prevSeries ? prevSeries.hidden : false);
          }
          /*if (!_.has(this.filteredData, series.label)) {
            _.set(this.filteredData, series.label, !series.hidden);
          }*/
        });
        this.seriesList = seriesList;
        this.updateColorScale();
        this.updateAllGraphElements();

        if (this.chartConfig.showLegend) {
          this.addSeriesLegend();
        }
      }
    );
  }

  private updateSeriesData() {
    const seriesToShow = _.filter(this.seriesList, (s: ChartSeries) => !s.hidden);
    const barSeries = _.filter(seriesToShow, (s: ChartSeries) => s.chartType === 'bar');
    if (_.size(barSeries) > 0) {
      this.updateScaleBand(barSeries);
    }

    const series = this.dataGroup.selectAll('g.series')
      .data(seriesToShow,
        s => s.label);

    series.exit()
      .remove();

    const newSeries = series.enter()
      .append('g')
      .attr('id', d => `series${_.replace(this.colors(d.label), '#', '')}`)
      .attr('class', 'series');

    newSeries.each((s: ChartSeries) => {
      if (s.chartType === 'line') {
        s.d3ChartInstance = new LineSeries(
          this.colors(s.label),
          s.label,
          this.xDomainType,
          s.showCircles,
          s.smoothStyle,
          s.showDataGaps);
      } else if (s.chartType === 'bar') {
        s.d3ChartInstance = new BarSeries(
          this.colors(s.label),
          s.label,
          this.scaleBandX,
          this.xDomainType,
          this.interval,
          s.smoothStyle);
      }
    });
    const seriesToUpdate = newSeries.merge(series);
    seriesToUpdate.each((s: ChartSeries) => {
      s.d3ChartInstance.xScale = this.x;
      s.d3ChartInstance.yScale = _.get(this.ys, s.unit.type);
      if (s.chartType === 'bar') {
        s.d3ChartInstance.scaleBandX = this.scaleBandX;
      }
      s.d3ChartInstance.update(s.data);
    });
  }

  private updateAllGraphElements() {
    this.updateYAxis();
    this.updateXAxes();
    this.updateSeriesData();
  }

  private initSVG(): void {
    // Init chartContainer
    this.chartContainer = d3.select(this.chartContainerRef.nativeElement)
      .attr('preserveAspectRatio', 'xMidYMid meet')
      .attr('viewBox', `0 0 ${WIDTH} ${HEIGHT}`)
      .attr('id', 'chartContainer');

    // Init chartGroup
    this.chartGroup = this.chartContainer.append('g')
      .attr('id', 'chartGroup')
      .attr('transform', 'translate(' + this.margin.left + ',' + this.margin.top + ')');

    // Init yAxesGroups
    this.yAxesGroup = this.chartGroup.append('g')
      .attr('id', 'yAxesGroup')
      .attr('color', '#343b40');
    this.yAxesGroup.append('g').attr('id', 'yLeftGroup');
    this.yAxesGroup.append('g').attr('id', 'yRightGroup');

    // Init xAxisGroup
    this.xAxisGroup = this.chartGroup.append('g')
      .attr('id', 'xAxisGroup')
      .attr('color', '#343b40')
      .attr('class', 'axis axis--x')
      .attr('transform', `translate(0, ${this.height})`);

    // Init data group
    this.dataGroup = this.chartGroup.append('g')
      .attr('id', 'dataGroup');

    // Init tooltipLine
    this.tooltipLine = this.dataGroup.append('line');

    // Init tooltip
    this.tooltip = d3.select('#tooltip');
    this.chartGroup.append('rect')
      .attr('transform', 'translate(' + this.margin.left + ',' + this.margin.top + ')')
      .attr('width', this.width - (this.margin.left + this.margin.right))
      .attr('height', this.height)
      .attr('opacity', 0)
      .on('mousemove', () => this.drawTooltip())
      .on('mouseout', () => {
        this.removeTooltip();
        this.removeHighlightenData();
      });

    // Init legend box
    if (this.chartConfig.showLegend) {
      this.legendContainer = d3.select(this.legendContainerRef.nativeElement);
    }
  }


  private initColorScale(): void {
    this.colors = d3.scaleOrdinal();
    this.colors.range(
      _.isNil(this.chartConfig.customColors) ?
        d3.schemeCategory10 :
        this.chartConfig.customColors);
  }

  private removeTooltip() {
    this.tooltip.style('display', 'none');
    this.tooltipLine.attr('stroke', 'none');
  }

  private removeHighlightenData() {
    _.each(this.seriesList, (series: ChartSeries) =>
      series.d3ChartInstance.updateFocus(null)
    );
  }

  private drawTooltip() {
    if (this.isDatasetEmpty(this.seriesList)) {
      return;
    }
    const mouseCoords = d3.mouse(this.dataGroup.node());

    const xValueMap: Record<XDomainType, Function> = {
      'number': (xCoord: number): number => this.x.invert(xCoord) as number,
      'time': (xCoord: number): moment.Moment => moment(this.x.invert(xCoord))
    };

    const xValueLabel: Record<XDomainType, Function> = {
      'number': (xV: number): string => xV.toString(),
      'time': (xV: moment.Moment): string => moment(xV).format('LL HH:mm')
    };

    const getDiff: Record<XDomainType, Function> = {
      'number': (xValueToCompare: number, datum: number): number => Math.abs(xValueToCompare - datum),
      'time': (xValueToCompare: moment.Moment, datum: moment.Moment): number => Math.abs(xValueToCompare.diff(datum, 's'))
    };

    const xValue: number | moment.Moment = xValueMap[this.xDomainType](mouseCoords[0]);

    const getNearestValue = (data: Array<ChartDatum>): ChartDatum => {
      const bisectIndex: number = this.bisect.left(data, xValue);

      const nearestDatum = bisectIndex >= data.length ?
        data[bisectIndex - 1] :
        bisectIndex === 0 ? data[bisectIndex] :
          getDiff[this.xDomainType](xValue, data[bisectIndex - 1].x)
            > (_.isNil(data[bisectIndex]) ?
              - 1 :
              getDiff[this.xDomainType](data[bisectIndex].x, xValue)
            ) ?
            data[bisectIndex]
            : data[bisectIndex - 1];

      return nearestDatum;
    };

    const nearestValue = _.chain(this.seriesList)
      .map(s => {
        const nearest = getNearestValue(_.filter(s.data, d => !_.isNil(d)));
        const deltaX = getDiff[this.xDomainType](
          nearest.x,
          xValueMap[this.xDomainType](mouseCoords[0])
        );
        return deltaX < this.interval / 2
          ? {
            deltaX: deltaX,
            nearestV: nearest
          } : null;
      })
      .filter(v => !_.isNil(v))
      .minBy(v => v.deltaX)
      .get('nearestV')
      .value();


    if (_.isNil(nearestValue)) {
      this.removeTooltip();
    } else {
      const tooltipData = _.chain(this.seriesList)
        .filter(series => !series.hidden)
        .map(series => {
          const tooltipValue = _.chain(series.data)
            .filter(d => !_.isNil(d))
            .find(d => getDiff[this.xDomainType](nearestValue.x, d.x) < this.interval / 10)
            .value();
          series.d3ChartInstance.updateFocus(tooltipValue);
          return tooltipValue ?
            `<div style="width:15px; height:15px; border-radius:3px; margin-right:0.4rem; background-color:${
            this.colors(series.label)}"> </div>` +
            series.label + ': ' + tooltipValue.y + ' ' + series.unit.label
            : null;
        })
        .filter(v => !_.isNil(v))
        .value();

      // Update tooltip line position
      this.tooltipLine.raise();
      this.tooltipLine.attr('stroke', 'black')
        .attr('x1', this.x(nearestValue.x))
        .attr('x2', this.x(nearestValue.x))
        .attr('y1', 0)
        .attr('y2', this.height);

      this.tooltip.html(`<p style="opacity: 0.7; margin:0">${xValueLabel[this.xDomainType](nearestValue.x)}</p>`)
        .style('display', 'block')
        .style('left', d3.event.pageX + 20 + 'px')
        .style('top', d3.event.pageY - 20 + 'px');

      const tooltipRows = this.tooltip
        .selectAll('tooltip-row')
        .data(tooltipData);

      tooltipRows.exit().remove();

      tooltipRows.enter()
        .append('div')
        .attr('class', 'tooltip-row')
        .style('display', 'flex')
        .style('padding', '0.5rem')
        .merge(tooltipRows)
        .html((tooltipRow: HTMLElement) => tooltipRow);
    }
  }

  private updateXAxes(): void {
    // Check if there's at least one bar series 
    const addBarOffset = _.chain(this.seriesList)
      .filter(series => series.chartType === 'bar')
      .size().value() > 0;

    const leftOffset = this.yAxesGroup.select('#yLeftGroup').node().getBBox().width;
    const rightOffset = this.yAxesGroup.select('#yRightGroup').node().getBBox().width;
    const scales: Record<XDomainType, Function> = {
      'number': () => {
        const minDomain = addBarOffset ? this.xDomain.min - (this.interval * 3 / 4) : this.xDomain.min;
        const maxDomain = addBarOffset ? this.xDomain.max + (this.interval * 3 / 4) : this.xDomain.max;
        return d3.scaleLinear()
          .rangeRound([leftOffset, this.width - rightOffset])
          .domain([minDomain, maxDomain]);
      },
      'time': () => {
        const minDomain = addBarOffset ? moment(this.xDomain.min).subtract(this.interval * 3 / 4, 's') : this.xDomain.min;
        const maxDomain = addBarOffset ? moment(this.xDomain.max).add(this.interval * 3 / 4, 's') : this.xDomain.max;
        return d3.scaleTime()
          .rangeRound([leftOffset, this.width - rightOffset])
          .domain([minDomain, maxDomain]);
      }
    };
    // Set this.x (X scale) based on xDomainType
    this.x = _.get(scales, this.xDomainType)();
    this.xAxisGroup.call(d3.axisBottom(this.x));
  }

  private getYAxisInfo(unit: Unit): YAxisInfo {
    if (!_.has(PROBES_GRAPH_YAXIS_INFO, unit.type)) {
      // There is a new YAxis
      const newAxisInfo: YAxisInfo = {
        id: unit.type,
        type: 'linear',
        position: 'right',
        display: true,
        ticks: {
          min: null,
          max: null
        },
        scaleLabel: {
          display: true,
          labelString: unit.label,
        }
      };
      _.set(PROBES_GRAPH_YAXIS_INFO, unit.type, newAxisInfo);
    }
    return _.get(PROBES_GRAPH_YAXIS_INFO, unit.type);
  }

  private updateYAxis(): void {
    const uniqFilteredData = _.chain(this.seriesList)
      .filter(series => !series.hidden)
      .uniqBy('unit.type')
      .value();
    this.drawyAxesGroup(uniqFilteredData, 'left');
    this.drawyAxesGroup(uniqFilteredData, 'right');
  }

  private updateMinMaxAxisInfo(axisInfo: YAxisInfo, chartSeries: ChartSeries, dataSize: number): void {
    const getDataByType = (type: string) => _.chain(this.seriesList)
      .filter(s => s.unit.type === type && !s.hidden)
      .map((s: ChartSeries) => s.data)
      .flatten()
      .filter(v => !_.isNil(v))
      .value();

    const checkMinMaxValues = dataSize !== _.size(this.seriesList);

    const getMin = (series: ChartSeries): number => {
      const min = _.min(_.map(checkMinMaxValues ?
        getDataByType(series.unit.type) :
        _.filter(series.data, d => !_.isNil(d)),
        (d: ChartDatum) => d.y));
      return min > 0 ? 0 : min;
    };

    const getMax = (series: ChartSeries): number => {
      const max = _.max(_.map(checkMinMaxValues ?
        getDataByType(series.unit.type) :
        _.filter(series.data, d => !_.isNil(d)),
        (d: ChartDatum) => d.y));
      return max > 2 ? max : 2;
    };

    _.set(axisInfo, 'ticks.min', getMin(chartSeries));
    _.set(axisInfo, 'ticks.max', getMax(chartSeries));
  }

  private drawyAxesGroup(data: Array<ChartSeries>, position: 'left' | 'right'): void {
    const filteredSeries = _.filter(data, (series: ChartSeries) =>
      this.getYAxisInfo(series.unit).position === position);

    const groupID = `#y${_.upperFirst(position)}Group`;

    const axesSelection = this.yAxesGroup
      .select(groupID)
      .selectAll('.axis--y')
      .data(filteredSeries, s => s.unit.type);

    axesSelection.exit().remove();

    const newAxes = axesSelection.enter()
      .append('g')
      .attr('id', series => `yAxis${series.unit.type}`)
      .attr('class', `axis axis--y`);

    newAxes.append('text')
      .attr('class', 'text')
      .attr('class', 'axis-title')
      .attr('fill', '#777777')
      .attr('y', 0)
      .attr('dy', '0.5em')
      .text(series => series.unit.label);

    const axesToUpdate = newAxes.merge(axesSelection);
    axesToUpdate.each((series) => {
      const axisInfo = this.getYAxisInfo(series.unit);
      // Update Min/Max values
      this.updateMinMaxAxisInfo(axisInfo, series, _.size(data));

      if (!_.has(this.ys, series.unit.type)) {
        _.set(this.ys, series.unit.type, d3.scaleLinear()
          .rangeRound([this.height, TEXT_PADDING]));
      }
      const y = _.get(this.ys, series.unit.type)
        .domain([axisInfo.ticks.min, axisInfo.ticks.max]);

      d3.select(`#yAxis${series.unit.type}`).call(position === 'left' ?
        d3.axisLeft(y) : d3.axisRight(y));
    });

    let yAxisOffset = 0;
    const self = this;
    axesToUpdate.attr('transform', function () {
      yAxisOffset += this.getBBox().width + 5;
      return `translate(${position === 'left' ?
        yAxisOffset :
        self.width - yAxisOffset}, 0)`;
    });

  }

  private addSeriesLegend(): void {
    const legendBoxWidth = 15;
    const roundRect = 3;
    const legend = this.legendContainer.selectAll('g.legendItem')
      .data(this.seriesList, s => s.label);
    legend.exit().remove();

    const newLegendItems = legend.enter()
      .append('g')
      .attr('class', 'legendItem');

    const self = this;
    newLegendItems.append('rect')
      .attr('rx', roundRect)
      .attr('ry', roundRect)
      .attr('x', 2)
      .attr('y', 2)
      .attr('stroke-width', 2)
      .attr('width', legendBoxWidth)
      .attr('height', legendBoxWidth);

    newLegendItems.append('text')
      .attr('fill', '#343b40')
      .attr('x', 2 * legendBoxWidth);

    const legendItemsToUpdate = newLegendItems.merge(legend);
    legendItemsToUpdate.attr('transform', (d, i) =>
      // Create 2 columns
      `translate(${i % 2 === 0 ?
        0 :
        this.legendContainer.node().getBoundingClientRect().width / 2
      }, ${_.toInteger(i / 2) * 20})`
    ).on('click', function (series: ChartSeries) {
      const hidden = series.hidden;
      const selectedLegendItem = d3.select(this);
      // const text = selectedLegendItem.select('text');
      // text.attr('text-decoration', hidden ? '' : 'line-through');
      selectedLegendItem.attr('fill-opacity', hidden ? 1 : 0.2);
      selectedLegendItem.select('rect').attr('fill-opacity', hidden ? 1 : 0.2)
      _.set(series, 'hidden', !hidden);
      self.updateAllGraphElements();
    });

    // Update rect color
    legendItemsToUpdate.selectAll('rect')
      .attr('stroke', (series: ChartSeries) => this.colors(series.label))
      .attr('fill', (series: ChartSeries) => this.colors(series.label))
      .attr('fill-opacity', (series: ChartSeries) => series.hidden ? 0.2 : 1);

    // Update legendItem label
    legendItemsToUpdate.selectAll('text')
      // .attr('text-decoration', (series: ChartSeries) => series.hidden ? 'line-through' : '')
      .attr('y', 15).text((series: ChartSeries) => series.label);

    this.legendContainer.style('height', this.legendContainer.node().getBBox().height + roundRect);
  }

  private updateScaleBand(barSeriesList: Array<ChartSeries>): void {
    if (_.isNil(this.scaleBandX)) {
      this.scaleBandX = d3.scaleBand();
    }

    const firstXTick = this.x.ticks()[0];
    const rangeRound: Record<XDomainType, Function> = {
      'number': () => [
        0,
        this.x((firstXTick as number) + this.interval) - (this.x as ScaleLinear<number, number>)((firstXTick as number))]
      ,
      'time': () => [
        0,
        this.x(moment(firstXTick).add(this.interval, 's')) - (this.x as ScaleTime<number, number>)(moment(firstXTick))]
    };

    this.scaleBandX
      .rangeRound(_.get(rangeRound, this.xDomainType)())
      .paddingOuter(0.3)
      .paddingInner(0.1)
      .domain(
        _.map(barSeriesList, v => v.label)
      );
  }

  private updateColorScale(): void {
    const domain = new Array();
    const range = _.clone(this.colors.range());

    _.forEach(this.seriesList, (series, index) => {
      // Set series custom color if defined
      if (!_.isNil(series.color)) {
        range[index] = series.color;
      }
      if (_.isNil(range[index])) {
        range[index] = d3.schemeCategory10[index];
      }
      domain[index] = series.label;
    });

    this.colors.domain(domain).range(range);
  }

  ngOnDestroy(): void {
    this.dataSubscription.unsubscribe();
  }
}
