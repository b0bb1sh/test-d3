import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { B3ChartComponent } from './b3-chart.component';

describe('B3ChartComponent', () => {
  let component: B3ChartComponent;
  let fixture: ComponentFixture<B3ChartComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ B3ChartComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(B3ChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
