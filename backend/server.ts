
import express = require('express');
import cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

type Sample = {
  time: string;
  value: number;
};

type Metric = {
  value: number;
  unit: string;
  history: Sample[];
  baseline: number;
};

const metrics: {
  velocity: Metric;
  pressure: Metric;
  temperature: Metric;
} = {
  velocity: {
    value: 185.4,
    unit: 'cm/s',
    baseline: 185.4,
    history: []
  },
  pressure: {
    value: 1012,
    unit: 'mbar',
    baseline: 1012,
    history: []
  },
  temperature: {
    value: 36.8,
    unit: '°C',
    baseline: 36.8,
    history: []
  }
};

let cycle = 0;

function addSample(metric: Metric) {
  metric.history.push({
    time: new Date().toISOString(),
    value: Number(metric.value.toFixed(2))
  });

  if (metric.history.length > 100) {
    metric.history.shift();
  }
}

// Seed a full minute of varied history so the dashboard has a useful trend immediately.
for (let i = 0; i < 100; i++) {
  const time = new Date(Date.now() - (99 - i) * 1000).toISOString();
  Object.values(metrics).forEach(metric => {
    const value = i === 99
      ? metric.value
      : metric.baseline * (1 + (Math.random() * 0.06) - 0.03);
    metric.history.push({ time, value: Number(value.toFixed(2)) });
  });
}

function updateMetric(metric: Metric) {
  if (cycle % 5 === 0) {
    // Gradually return toward the baseline.
    metric.value += (metric.baseline - metric.value) * 0.25;
  } else {
    // Random change of approximately +/- 10%.
    const change = (Math.random() * 0.2) - 0.1;
    metric.value *= 1 + change;
  }

  addSample(metric);
}

app.get('/api/dashboard', (_req, res) => {
  res.json({
    timestamp: new Date().toISOString(),
    velocity: {
      value: metrics.velocity.value,
      unit: metrics.velocity.unit,
      history: metrics.velocity.history
    },
    pressure: {
      value: metrics.pressure.value,
      unit: metrics.pressure.unit,
      history: metrics.pressure.history
    },
    temperature: {
      value: metrics.temperature.value,
      unit: metrics.temperature.unit,
      history: metrics.temperature.history
    }
  });
});

setInterval(() => {
  cycle++;

  Object.values(metrics).forEach(updateMetric);
}, 1000);

app.listen(3000, () => {
  console.log('Telemetry API running at http://localhost:3000');
});
