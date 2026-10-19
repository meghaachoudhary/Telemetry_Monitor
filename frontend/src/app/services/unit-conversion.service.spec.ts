import { TestBed } from '@angular/core/testing';
import { UnitConversionService } from './unit-conversion.service';

describe('UnitConversionService', () => {
  let service: UnitConversionService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(UnitConversionService);
  });

  it('converts velocity between metric and imperial units', () => {
    expect(service.convert(185.4, 'velocity', 'cm/s', 'mm/s')).toBeCloseTo(1854);
    expect(service.convert(10, 'velocity', 'm/s', 'km/h')).toBeCloseTo(36);
    expect(service.convert(10, 'velocity', 'm/s', 'ft/s')).toBeCloseTo(32.8084, 3);
  });

  it('converts pressure between SI and common pressure units', () => {
    expect(service.convert(1012, 'pressure', 'mbar', 'kPa')).toBeCloseTo(101.2);
    expect(service.convert(1, 'pressure', 'atm', 'psi')).toBeCloseTo(14.6959, 3);
  });

  it('converts temperature in both directions', () => {
    expect(service.convert(36.8, 'temperature', '°C', '°F')).toBeCloseTo(98.24);
    expect(service.convert(32, 'temperature', '°F', '°C')).toBeCloseTo(0);
    expect(service.convert(0, 'temperature', '°C', 'K')).toBeCloseTo(273.15);
  });
});
