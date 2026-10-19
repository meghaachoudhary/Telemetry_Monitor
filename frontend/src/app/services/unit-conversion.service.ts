
import { Injectable } from '@angular/core';

export type MetricParameter = 'velocity' | 'pressure' | 'temperature';

@Injectable({ providedIn: 'root' })
export class UnitConversionService {
  convert(
    value: number,
    parameter: MetricParameter,
    from: string,
    to: string
  ): number {
    if (parameter === 'velocity') {
      const factors: Record<string, number> = {
        'mm/s': 0.001,
        'cm/s': 0.01,
        'm/s': 1,
        'km/h': 1 / 3.6,
        'ft/s': 0.3048
      };

      if (!(from in factors) || !(to in factors)) {
        throw new Error(`Unsupported velocity unit conversion: ${from} to ${to}`);
      }
      if (from === to) return value;
      return value * factors[from] / factors[to];
    }

    if (parameter === 'pressure') {
      const factors: Record<string, number> = {
        'Pa': 1,
        'kPa': 1000,
        'mbar': 100,
        'bar': 100000,
        'psi': 6894.757293,
        'atm': 101325
      };

      if (!(from in factors) || !(to in factors)) {
        throw new Error(`Unsupported pressure unit conversion: ${from} to ${to}`);
      }
      if (from === to) return value;
      return value * factors[from] / factors[to];
    }

    if (parameter === 'temperature') {
      const units = ['°C', '°F', 'K'];
      if (!units.includes(from) || !units.includes(to)) {
        throw new Error(`Unsupported temperature unit conversion: ${from} to ${to}`);
      }
      if (from === to) return value;
      let celsius = value;

      if (from === '°F') {
        celsius = (value - 32) * 5 / 9;
      } else if (from === 'K') {
        celsius = value - 273.15;
      }

      if (to === '°F') {
        return celsius * 9 / 5 + 32;
      }

      if (to === 'K') {
        return celsius + 273.15;
      }

      return celsius;
    }

    throw new Error(`Unsupported unit conversion: ${parameter} ${from} to ${to}`);
  }
}
