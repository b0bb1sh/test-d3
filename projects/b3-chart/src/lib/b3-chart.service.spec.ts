import { TestBed } from '@angular/core/testing';

import { B3ChartService } from './b3-chart.service';

describe('B3ChartService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: B3ChartService = TestBed.get(B3ChartService);
    expect(service).toBeTruthy();
  });
});
