export interface TelemetrySample {
  time: string;
  value: number;
}

export interface TelemetryMetric {
  value: number;
  unit: string;
  history: TelemetrySample[];
}

export interface DashboardResponse {
  timestamp: string;
  velocity: TelemetryMetric;
  pressure: TelemetryMetric;
  temperature: TelemetryMetric;
}