import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { Subscription, catchError, map, of, switchMap, timer } from 'rxjs';
import { DashboardResponse, TelemetrySample } from '../../models/dashboard.model';
import { DashboardService } from '../../services/dashboard.service';
import { UnitConversionService } from '../../services/unit-conversion.service';
import { MetricCard, MetricParameter } from '../metric-card/metric-card';

type ConnectionState = 'connecting' | 'online' | 'offline';
type UnitMap = Record<MetricParameter, string>;
type ExportRow = {
  timestamp: string;
  velocity: number | null;
  pressure: number | null;
  temperature: number | null;
};

const UNIT_OPTIONS: Record<MetricParameter, string[]> = {
  velocity: ['mm/s', 'cm/s', 'm/s', 'km/h', 'ft/s'],
  pressure: ['Pa', 'kPa', 'mbar', 'bar', 'psi', 'atm'],
  temperature: ['°C', '°F', 'K']
};

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, MetricCard],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard implements OnInit, OnDestroy {
  private readonly dashboardService = inject(DashboardService);
  private readonly unitConversion = inject(UnitConversionService);
  private readonly changeDetector = inject(ChangeDetectorRef);
  private subscription?: Subscription;
  private readonly collectedSamples = new Map<string, ExportRow>();

  dashboard: DashboardResponse | null = null;
  connection: ConnectionState = 'connecting';
  loading = true;
  errorMessage = '';
  exportError = '';
  lastUpdated: Date | null = null;
  theme: 'light' | 'dark' = 'light';
  readonly units: UnitMap = {
    velocity: 'cm/s',
    pressure: 'mbar',
    temperature: '°C'
  };
  readonly unitOptions = UNIT_OPTIONS;

  ngOnInit(): void {
    this.theme = localStorage.getItem('telemetry-theme') === 'dark' ? 'dark' : 'light';
    this.applyTheme();
    this.subscription = timer(0, 1000).pipe(
      switchMap(() => this.dashboardService.getDashboard().pipe(
        map(data => ({ data, error: null as HttpErrorResponse | null })),
        catchError((error: HttpErrorResponse) => of({ data: null, error }))
      ))
    ).subscribe(({ data, error }) => {
      this.loading = false;
      if (error) {
        this.connection = 'offline';
        this.errorMessage = 'Unable to reach the telemetry service. Retrying automatically.';
        this.changeDetector.markForCheck();
        return;
      }

      if (!data) {
        return;
      }
      this.dashboard = data;
      this.lastUpdated = new Date(data.timestamp);
      this.connection = 'online';
      this.errorMessage = '';
      this.collect(data);
      this.changeDetector.markForCheck();
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  changeUnit(parameter: MetricParameter, unit: string): void {
    this.units[parameter] = unit;
  }

  toggleTheme(): void {
    this.theme = this.theme === 'light' ? 'dark' : 'light';
    localStorage.setItem('telemetry-theme', this.theme);
    this.applyTheme();
  }

  async exportExcel(): Promise<void> {
    if (this.collectedSamples.size === 0) {
      return;
    }
    this.exportError = '';
    try {
      const { default: ExcelJS } = await import('exceljs');
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Telemetry');
      sheet.columns = [
        { header: 'Timestamp', key: 'timestamp', width: 28 },
        { header: `Velocity (${this.units.velocity})`, key: 'velocity', width: 20 },
        { header: `Pressure (${this.units.pressure})`, key: 'pressure', width: 20 },
        { header: `Temperature (${this.units.temperature})`, key: 'temperature', width: 22 }
      ];
      for (const row of this.exportRows()) {
        sheet.addRow(row);
      }
      sheet.getRow(1).font = { bold: true };
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      this.download(blob, 'telemetry.xlsx');
    } catch (error) {
      this.exportError = error instanceof Error ? error.message : 'Excel export failed.';
      this.changeDetector.markForCheck();
    }
  }

  exportCsv(): void {
    try {
      this.exportError = '';
      const rows = this.exportRows();
      if (rows.length === 0) {
        return;
      }
      const headers = [
        'Timestamp',
        `Velocity (${this.units.velocity})`,
        `Pressure (${this.units.pressure})`,
        `Temperature (${this.units.temperature})`
      ];
      const csv = [headers, ...rows.map(row => [
        row.timestamp,
        row.velocity === null ? '' : this.formatExportValue(row.velocity),
        row.pressure === null ? '' : this.formatExportValue(row.pressure),
        row.temperature === null ? '' : this.formatExportValue(row.temperature)
      ])].map(row => row.map(value => this.csvCell(String(value))).join(',')).join('\r\n');
      this.download(new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' }), 'telemetry.csv');
    } catch (error) {
      this.exportError = error instanceof Error ? error.message : 'CSV export failed.';
    }
  }

  private applyTheme(): void {
    document.documentElement.dataset['theme'] = this.theme;
  }

  private collect(data: DashboardResponse): void {
    const metrics: MetricParameter[] = ['velocity', 'pressure', 'temperature'];
    for (const parameter of metrics) {
      for (const sample of data[parameter].history) {
        const timestamp = this.normalizeTimestamp(sample, data.timestamp);
        const row = this.collectedSamples.get(timestamp) ?? {
          timestamp,
          velocity: null,
          pressure: null,
          temperature: null
        };
        row[parameter] = sample.value;
        this.collectedSamples.set(timestamp, row);
      }
    }
    const oldestAllowed = Date.now() - 100 * 1000;
    for (const [timestamp] of this.collectedSamples) {
      if (new Date(timestamp).getTime() < oldestAllowed) {
        this.collectedSamples.delete(timestamp);
      }
    }
  }

  private normalizeTimestamp(sample: TelemetrySample, snapshotTime: string): string {
    const parsed = new Date(sample.time);
    if (!Number.isNaN(parsed.getTime()) && sample.time.includes('T')) {
      return parsed.toISOString();
    }
    const date = new Date(snapshotTime);
    const timeParts = sample.time.split(':').map(Number);
    if (timeParts.length !== 3 || timeParts.some(Number.isNaN)) {
      return date.toISOString();
    }
    date.setUTCHours(timeParts[0], timeParts[1], Math.floor(timeParts[2]));
    date.setUTCMilliseconds(0);
    return date.toISOString();
  }

  private exportRows(): ExportRow[] {
    const sourceUnits: UnitMap = { velocity: 'cm/s', pressure: 'mbar', temperature: '°C' };
    return [...this.collectedSamples.values()]
      .sort((left, right) => left.timestamp.localeCompare(right.timestamp))
      .map(row => ({
        timestamp: row.timestamp,
        velocity: this.convertExportValue(row.velocity, 'velocity', sourceUnits.velocity),
        pressure: this.convertExportValue(row.pressure, 'pressure', sourceUnits.pressure),
        temperature: this.convertExportValue(row.temperature, 'temperature', sourceUnits.temperature)
      }));
  }

  private convertExportValue(
    value: number | null,
    parameter: MetricParameter,
    sourceUnit: string
  ): number | null {
    return value === null ? null : this.unitConversion.convert(value, parameter, sourceUnit, this.units[parameter]);
  }

  private formatExportValue(value: number): string {
    return Number(value.toFixed(4)).toString();
  }

  private csvCell(value: string): string {
    return /[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
  }

  private download(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
