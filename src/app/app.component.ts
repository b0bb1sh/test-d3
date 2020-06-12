import { Component, OnInit } from '@angular/core';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { ChartSeries, AxisDomain } from './chart/chart.model';
import * as moment from 'moment';
import * as _ from 'lodash';

const u: ChartSeries = {
  label: 'Series ',
  chartType: 'line',
  unit: {
    label: 'C',
    type: 'tc'
  },
  data: [
    { y: 23.02, x: moment.unix(1590357600) },
    { y: 34.02, x: moment.unix(1590357600) },
    { y: 34.02, x: moment.unix(1590357600) },
    { y: 26.02, x: moment.unix(1590357600) },
    { y: 24.03, x: moment.unix(1590357600) },
    { y: 23.02, x: moment.unix(1590357600) },
    { y: 23.02, x: moment.unix(1590357600) },
    { y: 22.02, x: moment.unix(1590357600) },
    { y: 12.02, x: moment.unix(1590357600) },
    { y: 45.02, x: moment.unix(1590357600) },
    { y: 3.02, x: moment.unix(1590357600) },
    { y: 40.12, x: moment.unix(1590357600) },
    { y: 0.02, x: moment.unix(1590357600) },
    { y: 0.32, x: moment.unix(1590357600) },
    { y: 0.02, x: moment.unix(1590357600) },
    { y: 0.02, x: moment.unix(1590357600) },
    { y: 0.02, x: moment.unix(1590357600) },
    { y: 0.02, x: moment.unix(1590357600) },
    { y: 0.02, x: moment.unix(1590357600) }
  ],
  hidden: false,
  showCircles: true,
  smoothStyle: true
};

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})

export class AppComponent implements OnInit {
  xDomainType$ = new BehaviorSubject<'time' | 'number'>('time');
  xAxesDomain$: Observable<AxisDomain<moment.Moment | number>>;
  interval$ = of(3600);
  data$: Observable<Array<ChartSeries>>;
  data = new BehaviorSubject([]);
  counter = 0;
  smoothStyle = true;
  showDataGaps = false;

  ngOnInit() {

    this.xAxesDomain$ = this.xDomainType$.pipe(
      tap(() => this.data.next([])),
      map(domain => domain === 'time' ? {
        min: moment.unix(1590357600),
        max: moment.unix(1590357600).add(1, 'd')
      } : {
          min: 0,
          max: 30
        })
    );
    this.interval$ = this.xDomainType$.pipe(
      map(domain => domain === 'time' ? 3600 : 1)
    );
  }

  updateXDomain($event) {
    this.xDomainType$.next($event);
  }

  addSeries(chartType?: 'bar' | 'line') {
    const d = this.data.getValue();
    const i = d.length;
    const newSeries = {
      label: u.label + this.counter++,
      unit: i === 1 ? { label: '%', type: 'rh' } : i === 2 ? { label: 'ppm', type: 'co' } : i === 3 ? { label: 'm3', type: 'm3' } : u.unit,
      data: _.chain(u.data)
        .map((v, index) => index * Math.round(Math.random() * 9) === index ? null : ({
          y: v.y + Math.random() * (i < 2 ? 10 : 100),
          x: this.xDomainType$.getValue() === 'time' ?
            moment(v.x).add(index, 'h') :
            index
        }))
        // .filter(v => !_.isNil(v))
        .value(),
      chartType: chartType ? chartType : 'line',
      hidden: false,
      showCircles: u.showCircles,
      showDataGaps: this.showDataGaps,
      smoothStyle: this.smoothStyle
    };
    this.data.next(this.data.getValue().concat(newSeries));
  }

  addDatum(series: ChartSeries) {
    const addDatum = _.find(this.data.getValue(), s => s === series);
    _.assign(addDatum, {
      data: series.data.concat({
        x: this.xDomainType$.getValue() === 'time' ?
          moment(_.findLast(series.data, v => !_.isNil(v)).x).add(1, 'h') :
          _.findLast(series.data, v => !_.isNil(v)).x + 1,
        y: _.findLast(series.data, v => !_.isNil(v)).y + Math.random() * 10
      })
    });
    this.data.next(this.data.getValue());
  }

  removeDatum(series: ChartSeries) {
    const removeDatum = _.find(this.data.getValue(), s => s === series);
    _.assign(removeDatum, {
      data: series.data.slice(0, _.size(series.data) - 1)
    });
    this.data.next(this.data.getValue());
  }

  removeSeries(series: ChartSeries) {
    _.remove(this.data.getValue(), s => s === series);
    const d = this.data.getValue();
    this.data.next([]);
    this.data.next(d);
  }

  changeSmoothStyle() {
    this.smoothStyle = !this.smoothStyle;
    const d = _.map(this.data.getValue(), series =>
      _.assign(series, {
        smoothStyle: this.smoothStyle
      })
    );
    this.data.next([]);
    this.data.next(d);
  }


  updateShowDataGaps() {
    this.showDataGaps = !this.showDataGaps;
    const d = _.map(this.data.getValue(), series =>
      _.assign(series, {
        showDataGaps: this.showDataGaps
      })
    );
    this.data.next([]);
    this.data.next(d);
  }
}
