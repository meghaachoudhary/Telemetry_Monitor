# Northstar Controller Monitor

A real-time embedded-controller monitoring desktop app built with Angular, Electron, and a simulated TypeScript/Express telemetry service.

## Requirements

- Node.js 22.22.3+ (or 24.15.0+) and npm
- Windows, macOS, or Linux for development; Electron targets the host platform

## Run in development

Install each workspace's dependencies once:

```bash
cd backend
npm install
cd ../frontend
npm install
```

Start the API in one terminal:

```bash
cd backend
npm run dev
```

Start the Angular app and desktop window in a second terminal:

```bash
cd frontend
npm run electron:dev
```

The API is available at `http://localhost:3000/api/dashboard`. To use the browser instead of Electron, run `npm start` in `frontend` and open `http://localhost:4200`.

## Production build

Build the Angular frontend with `cd frontend && npm run build`. Build the API with `cd backend && npm run build`, then run it with `npm start` from `backend`. The Electron main process loads the generated Angular page when packaged; run `npm run electron` from `frontend` for the desktop shell.

The API must be running separately from the desktop application. It generates telemetry every second, varies each value by up to approximately 10%, nudges readings toward their baselines every fifth update, and retains the latest 100 samples per metric.

## Architecture and technical decisions

- **Frontend:** Standalone Angular components separate dashboard orchestration from reusable metric cards. `DashboardService` fetches the API; the dashboard polls every second and preserves the most recent successful data while reporting connection failures and retrying.
- **Charts:** Chart.js renders independent rolling 100-sample trends. The zoom plugin provides wheel/pinch zoom and Shift-drag pan; tooltip values and axis labels use the selected display unit. Unit conversion happens in the renderer and does not make API requests.
- **Gauges and status:** Lightweight SVG/CSS gauges animate without another charting dependency. Status thresholds are evaluated in the API's base units, so changing display units never changes status.
- **Exports:** CSV is generated in the browser. ExcelJS creates an `.xlsx` workbook. Both contain timestamps and all three readings, converted into the currently selected units.
- **Desktop:** Electron hosts the Angular app with context isolation, sandboxing, and Node integration disabled. The API runs as a separate local service.
- **Themes:** Light/dark theme variables are applied at runtime and the preference is saved in local storage.

## Assumptions

- The desktop client and API are on the same computer; the API listens on port 3000 and permits local development requests through CORS.
- The controller's canonical telemetry units are `cm/s`, `mbar`, and `°C`, as in the supplied sample. Export values follow the currently selected display units.
- Thresholds for warning and critical status are application defaults, evaluated in canonical units. They can be adjusted in `frontend/src/app/components/metric-card/metric-card.ts`.
- The service provides the latest 100 points with each response. The app keeps collected samples for export within that rolling history.

## Source layout

- `frontend/src/app`: Angular dashboard, metric cards, polling service, and unit conversion.
- `frontend/electron`: Electron main process and minimal preload.
- `backend/server.ts`: Express API and in-memory telemetry simulator.

Install/build output (`node_modules`, `dist`) is intentionally excluded from source delivery.
