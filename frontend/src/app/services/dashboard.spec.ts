import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { DashboardService } from './dashboard.service';

describe('DashboardService', () => {
  let service: DashboardService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(DashboardService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('requests the dashboard telemetry endpoint', () => {
    service.getDashboard().subscribe();
    const request = httpTesting.expectOne('http://localhost:3000/api/dashboard');
    expect(request.request.method).toBe('GET');
    request.flush({
      timestamp: '2026-07-22T15:10:05Z',
      velocity: { value: 185.4, unit: 'cm/s', history: [] },
      pressure: { value: 1012, unit: 'mbar', history: [] },
      temperature: { value: 36.8, unit: '°C', history: [] }
    });
    httpTesting.verify();
  });
});
