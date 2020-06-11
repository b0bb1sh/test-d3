import { Component, OnInit } from '@angular/core';
import { Observable, of, from, BehaviorSubject } from 'rxjs';
import { ChartSeries, AxisDomain } from './chart/chart.model';
import * as moment from 'moment';
import * as _ from 'lodash';

const u: ChartSeries = {
  label: 'Portata H2O [m3/h] - FQI1 CALDAIA 1',
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
  xAxesDomain$: Observable<AxisDomain<moment.Moment>>;
  xAxesDomainN$: Observable<AxisDomain<number>>;
  timeInterval$ = of(1800);
  numberInterval$ = of(0.7);
  data$: Observable<Array<ChartSeries>>;
  data = new BehaviorSubject([]);
  counter = 0;

  ngOnInit() {
    this.xAxesDomain$ = of(
      {
        min: moment.unix(1590357600),
        max: moment.unix(1590357600).add(1, 'd')
      }
    );

    this.xAxesDomainN$ = of(
      {
        min: 0,
        max: 30
      }
    );
  }

  addSeries() {
    const d = this.data.getValue();
    const i = d.length;
    const newSeries = {
      label: u.label + this.counter++,
      unit: i === 1 ? { label: '%', type: 'rh' } : i === 2 ? { label: 'ppm', type: 'co' } : i === 3 ? { label: 'm3', type: 'm3' } : u.unit,
      data: _.chain(u.data)
        .map((v, index) => index * Math.round(Math.random()) === index ? null : ({
          y: v.y + Math.random() * (i < 2 ? 10 : 100),
          x: moment(v.x).add(index, 'h')
          // x: index
        }))
        .filter(v => !_.isNil(v))
        .value(),
      chartType: i === 2 || i === 5 || i === 1 ? 'bar' : 'line',
      hidden: false,
      showCircles: u.showCircles,
      smoothStyle: true
    };
    console.log(newSeries.data);
    this.data.next(this.data.getValue().concat(newSeries));
  }

  addDatum() {
    const addDatum = _.map(this.data.getValue(), series =>
      _.assign(series, {
        data: series.data.concat({
          x: moment(_.last(series.data).x).add(1, 'h'),
          // x: _.last(series.data).x + Math.round(Math.random()),
          y: _.last(series.data).y + Math.random() * 10
        })
      })
    );
    this.data.next(addDatum);
  }

  removeDatum() {
    const addDatum = _.map(this.data.getValue(), series =>
      _.assign(series, {
        data: series.data.slice(0, _.size(series.data) - 1)
      })
    );
    this.data.next(addDatum);
  }

  removeSeries() {
    const d = this.data.getValue();
    this.data.next(d.slice(0, _.size(d) - 1));
  }

}
