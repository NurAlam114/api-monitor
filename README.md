# Intelligent API Monitoring & Alert System

A system that monitors external API health reports, detects anomalies with rule-based logic, uses an LLM (Google Gemini) to write human-readable alerts, stores them in MongoDB, and shows them in a React dashboard.

## Features

- **Health monitoring:** evaluates response time, HTTP status code, and returned data.
- **Anomaly detection (rule-based):** high latency, 4xx/5xx errors, zero records, missing or invalid fields.
- **AI-powered alerts:** Gemini writes a short alert per anomaly. If the AI fails or times out, a template alert is stored instead, so no anomaly is lost.
- **Storage:** alerts saved in MongoDB (Mongoose).
- **REST API:** `POST /monitor` (batch input), `GET /alerts`, `PATCH /alerts/:id/resolve`, `GET /health`.
- **Dashboard:** severity summary cards, filters, auto-refresh, resolve button, and a "Run sample monitor" button.
- **Batch processing:** `Promise.allSettled`, so one bad record never breaks the batch.
- **Dedup:** an identical active alert (same API, type, severity) is not stored twice.
- **Logging:** Winston, console plus `backend/logs/`.
- **Optional:** email report for new critical/high alerts (Nodemailer).

## Architecture

```
api-monitor/
├── backend/
│   ├── src/
│   │   ├── config/        env config, DB connection
│   │   ├── controllers/   monitorController, alertController
│   │   ├── middleware/    validateMonitor, errorHandler, requestLogger
│   │   ├── models/        Alert (Mongoose)
│   │   ├── routes/        route definitions
│   │   ├── services/      anomalyDetector, aiService, monitorService, emailService
│   │   ├── utils/         logger
│   │   ├── app.js         express app
│   │   └── server.js      entry point
│   ├── sample-data/apis.json
│   └── tests/             Jest unit tests
└── frontend/              React + Vite dashboard
```

**Flow:** `POST /monitor` -> validate body -> detect anomalies per record (pure function) -> for anomalous records, generate message with LLM (fallback to template) -> dedup check -> save to MongoDB -> return summary. The UI calls `GET /alerts`.

### Key design decisions

1. **Rules detect, AI explains.** Detection is deterministic and unit-tested. The LLM only writes the message, so an AI outage never causes missed anomalies.
2. **Fallback alerts.** Timeout (default 8s) and error handling in `aiService`; fallback sets `aiGenerated: false`.
3. **Configurable thresholds** via `.env`.
4. **One alert per API record**, covering all its anomalies, with the most severe as the primary type.

### Detection rules

| Condition | Type | Severity |
|---|---|---|
| response time > 3000 ms | HIGH_LATENCY | high |
| response time >= 5000 ms | HIGH_LATENCY | critical |
| status >= 500 | SERVER_ERROR | critical |
| status 400-499 | CLIENT_ERROR | medium |
| records_returned = 0 | NO_DATA | high |
| missing or invalid fields | INVALID_RESPONSE | medium |

## Prerequisites

- Node.js 18+
- MongoDB (Atlas free cluster or local)
- Gemini API key (https://aistudio.google.com), optional: without it, template alerts are used

## Setup and run

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env     # on Windows: copy .env.example .env
# edit .env: set MONGODB_URI and GEMINI_API_KEY
npm run dev              # or: npm start
```

Backend runs on http://localhost:5000.

### 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Open http://localhost:5173.

### 3. Tests

```bash
cd backend
npm test
```

## API

### `POST /monitor`

Body: array of API records.

```bash
curl -X POST http://localhost:5000/monitor \
  -H "Content-Type: application/json" \
  -d @backend/sample-data/apis.json
```

Response (201):

```json
{
  "success": true,
  "summary": { "processed": 7, "healthy": 2, "anomaliesFound": 5, "alertsCreated": 5, "duplicatesSkipped": 0, "errors": 0 },
  "alerts": [ { "apiName": "AppointmentAPI", "severity": "critical", "message": "...", "aiGenerated": true } ],
  "errors": []
}
```

### `GET /alerts`

Returns active alerts, newest first. Optional query params: `severity` (critical|high|medium), `apiName`, `status` (active|resolved|all).

```bash
curl "http://localhost:5000/alerts?severity=critical"
```

### `PATCH /alerts/:id/resolve`

Marks an alert as resolved.

### `GET /health`

Server liveness check.

## Optional: email reports

Set in `backend/.env`:

```
EMAIL_ENABLED=true
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=you@gmail.com
SMTP_PASS=<gmail app password>
EMAIL_TO=recipient@example.com
```

After each `/monitor` run, critical and high alerts created are emailed.

## Possible improvements

- Scheduled polling of real API endpoints (cron) instead of only pushed reports
- Queue (BullMQ) for large batches and AI rate limiting
- Authentication on `/monitor`
- Per-API custom thresholds and trend-based anomaly detection
- Auto-resolve alerts when the API recovers
