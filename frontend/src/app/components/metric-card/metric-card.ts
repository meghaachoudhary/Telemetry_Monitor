import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges, ViewChild, inject } from '@angular/core';
import {
  Chart,
  ChartConfiguration,
  CategoryScale,
  Filler,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip
} from 'chart.js';
import zoomPlugin from 'chartjs-plugin-zoom';
import { TelemetryMetric } from '../../models/dashboard.model';
import { MetricParameter, UnitConversionService } from '../../services/unit-conversion.service';

Chart.register(CategoryScale, LinearScale, LineController, LineElement, PointElement, Tooltip, Legend, Filler, zoomPlugin);
export type { MetricParameter } from '../../services/unit-conversion.service';
type MetricStatus = 'Normal' | 'Warning' | 'Critical';

const PRESENTATION: Record<MetricParameter, { title: string; description: string; color: string; range: [number, number] }> = {
  velocity: { title: 'Velocity', description: 'Rotor speed', color: '#5b79df', range: [0, 300] },
  pressure: { title: 'Pressure', description: 'System pressure', color: '#2ca887', range: [800, 1200] },
  temperature: { title: 'Temperature', description: 'Core temperature', color: '#e99a53', range: [0, 80] }
};

@Component({
  selector: 'app-metric-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './metric-card.html',
  styleUrl: './metric-card.css'
})
export class MetricCard implements AfterViewInit, OnChanges, OnDestroy {
  @Input({ required: true }) parameter!: MetricParameter;
  @Input({ required: true }) metric!: TelemetryMetric;
  @Input({ required: true }) unit!: string;
  @Input() unitOptions: string[] = [];
  @Input() updatedAt = '';
  @Output() unitChange = new EventEmitter<string>();
  @ViewChild('chartCanvas') private chartCanvas?: ElementRef<HTMLCanvasElement>;

  private chart?: Chart<'line', number[], string>;
  private themeObserver?: MutationObserver;
  private readonly conversion = inject(UnitConversionService);

  get title(): string { return this.presentation.title; }
  get description(): string { return this.presentation.description; }
  get color(): string { return this.presentation.color; }
  get presentation(): typeof PRESENTATION[MetricParameter] { return PRESENTATION[this.parameter]; }
  get value(): number { return this.conversion.convert(this.metric.value, this.parameter, this.metric.unit, this.unit); }
  get status(): MetricStatus {
    const canonical = this.metric.value;
    if (this.parameter === 'velocity') {
      if (canonical < 50 || canonical > 300) return 'Critical';
      if (canonical < 100 || canonical > 250) return 'Warning';
    } else if (this.parameter === 'pressure') {
      if (canonical < 850 || canonical > 1150) return 'Critical';
      if (canonical < 950 || canonical > 1100) return 'Warning';
    } else {
      if (canonical < 10 || canonical > 60) return 'Critical';
      if (canonical < 20 || canonical > 50) return 'Warning';
    }
    return 'Normal';
  }
  get gaugePercent(): number {
    const from = this.conversion.convert(this.presentation.range[0], this.parameter, this.metric.unit, this.unit);
    const to = this.conversion.convert(this.presentation.range[1], this.parameter, this.metric.unit, this.unit);
    const percent = ((this.value - from) / (to - from)) * 100;
    return Math.min(100, Math.max(0, percent));
  }
  get gaugeOffset(): number {
    return 307.88 * (1 - this.gaugePercent / 100);
  }
  get gaugeStyle(): Record<string, string> {
    return { '--metric-color': this.color };
  }
  get timeUpdated(): Date | null {
    const date = new Date(this.updatedAt);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  ngAfterViewInit(): void {
    this.createChart();
    this.themeObserver = new MutationObserver(() => this.updateChart());
    this.themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  }

  ngOnChanges(_changes: SimpleChanges): void {
    if (this.chart) {
      this.updateChart();
    }
  }

  ngOnDestroy(): void {
    this.themeObserver?.disconnect();
    this.chart?.destroy();
  }

  onUnitSelect(event: Event): void {
    this.unitChange.emit((event.target as HTMLSelectElement).value);
  }

  resetZoom(): void {
    this.chart?.resetZoom();
  }

  private createChart(): void {
    const canvas = this.chartCanvas?.nativeElement;
    if (!canvas) return;
    const config: ChartConfiguration<'line', number[], string> = {
      type: 'line',
      data: { labels: [], datasets: [{
        data: [],
        borderColor: this.color,
        backgroundColor: `${this.color}18`,
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 4,
        pointHoverBackgroundColor: this.color,
        tension: 0.34,
        fill: true
      }] },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 350 },
        interaction: { intersect: false, mode: 'index' },
        plugins: {
          legend: { display: false },
          tooltip: {
            displayColors: false,
            padding: 10,
            callbacks: {
              title: items => items[0]?.label ? new Date(items[0].label).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '',
              label: context => `${Number(context.parsed.y).toFixed(1)} ${this.unit}`
            }
          },
          zoom: {
            limits: { x: { minRange: 3 } },
            pan: { enabled: true, mode: 'x', modifierKey: 'shift' },
            zoom: {
              mode: 'x',
              wheel: { enabled: true },
              pinch: { enabled: true },
              drag: { enabled: false }
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            border: { display: false },
            ticks: {
              color: this.tickColor(),
              maxTicksLimit: 5,
              maxRotation: 0,
              callback: (_value, index) => {
                const label = this.chart?.data.labels?.[index];
                return typeof label === 'string'
                  ? new Date(label).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                  : '';
              }
            }
          },
          y: {
            grid: { color: this.gridColor() },
            border: { display: false, dash: [3, 4] },
            ticks: { color: this.tickColor(), maxTicksLimit: 4, precision: 1 },
            title: { display: true, text: this.unit, color: this.tickColor(), font: { size: 9 } }
          }
        }
      }
    };
    this.chart = new Chart(canvas, config);
    this.updateChart();
  }

  private updateChart(): void {
    if (!this.chart || !this.metric) return;
    const history = this.metric.history.slice(-100);
    this.chart.data.labels = history.map(sample => this.toIsoTime(sample.time));
    this.chart.data.datasets[0].data = history.map(sample =>
      this.conversion.convert(sample.value, this.parameter, this.metric.unit, this.unit)
    );
    this.chart.data.datasets[0].borderColor = this.color;
    this.chart.data.datasets[0].backgroundColor = `${this.color}18`;
    const yScale = this.chart.options.scales?.['y'];
    const xScale = this.chart.options.scales?.['x'];
    if (yScale && xScale) {
      if (yScale.title) yScale.title.text = this.unit;
      yScale.ticks = { ...yScale.ticks, color: this.tickColor() };
      xScale.ticks = { ...xScale.ticks, color: this.tickColor() };
      yScale.grid = { ...yScale.grid, color: this.gridColor() };
    }
    this.chart.update();
  }

  private toIsoTime(time: string): string {
    if (time.includes('T')) return time;
    const date = new Date(this.updatedAt);
    const parts = time.split(':').map(Number);
    if (parts.length === 3 && parts.every(value => Number.isFinite(value))) {
      date.setUTCHours(parts[0], parts[1], Math.floor(parts[2]), 0);
    }
    return date.toISOString();
  }

  private tickColor(): string {
    return getComputedStyle(document.documentElement).getPropertyValue('--muted').trim() || '#8791a3';
  }

  private gridColor(): string {
    return getComputedStyle(document.documentElement).getPropertyValue('--chart-grid').trim() || '#edf0f4';
  }
}
