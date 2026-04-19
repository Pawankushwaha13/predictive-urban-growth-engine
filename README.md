# Predictive Urban Growth Engine

MERN-style geospatial analytics dashboard for real-estate investment teams that want to identify future high-growth zones before appreciation is fully visible in lagging sales data.

## What this working build does

- Scores micro-markets with a `Growth Velocity Score` built from:
  - municipal declarations and infrastructure catalysts
  - market demand signals
  - rental yield and pricing dislocation
  - supply-side risk
- Visualizes hotspots on an interactive India map
- Renders zone intensity with `heat-style` circles and ranked hotspots
- Ranks micro-markets by projected upside over a `24-60 month` horizon
- Runs in `demo fallback` mode without MongoDB, so the product works immediately
- Accepts `CSV`, `Excel`, and `JSON` uploads for custom zone datasets
- Harvests municipal signals from `PDF`, `HTML`, `TXT`, or pasted text
- Aggregates portal-style market snapshots for listing density, pricing velocity, and search demand
- Supports `live-style connector presets` for municipal portals, `99acres`, and `MagicBricks`
- Crawls linked municipal tender documents from a landing page before scoring
- Generates explainable `AI memo` summaries for each hotspot

## Product framing

This first working version is designed around the project brief:

- `Municipal declarations` act as lead indicators
- `Market activity` acts as a demand indicator
- `Rental and pricing spread` highlights undervaluation
- The dashboard projects all of that into a hotspot-oriented, map-first workflow

The current scoring engine is rules-based and explainable. Municipal and market harvesting are now available in-app, with demo source packs plus manual source input. This makes the system a strong base for later upgrades like scheduled live crawling, richer OCR, and model retraining.

## Project structure

```text
.
|-- api/        # Vercel function entry points
|-- client/     # React + Vite dashboard
|-- examples/   # Sample import files
|-- server/     # Express API, scoring engine, persistence, ingestion
`-- README.md
```

## Quick start

### 1. Install dependencies

```bash
npm install
npm install --prefix server
npm install --prefix client
```

### 2. Configure environment

Copy these files and update values as needed:

- `server/.env.example` -> `server/.env`
- `client/.env.example` -> `client/.env`

Minimum backend config:

```env
PORT=5000
CLIENT_URL=http://localhost:5173
DATABASE_URI=mongodb://127.0.0.1:27017/urban-growth-engine
```

If `DATABASE_URI` is missing or MongoDB is unavailable, the API automatically runs in demo mode with built-in micro-market data.

### 3. Start the stack

```bash
npm run dev
```

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5000`

## API overview

### Zones

- `GET /api/zones`
- `GET /api/zones/summary`
- `POST /api/zones/seed`

### Manual ingestion

- `POST /api/ingestion/manual`
  - multipart field: `file`
  - supports `.csv`, `.xls`, `.xlsx`, `.json`

### Predictive pipeline connectors

- `GET /api/connectors/templates`
- `POST /api/connectors/municipal/harvest`
  - multipart field: `file`
  - accepts `.pdf`, `.html`, `.htm`, `.txt`
  - also accepts pasted `rawText`
  - accepts `profileId`, `sourceUrl`, `crawlLinkedDocuments`, `maxLinkedDocuments`
- `POST /api/connectors/market/harvest`
  - accepts JSON body for portal-style market snapshots
  - supports `connectorId` values such as `99acres-live` and `magicbricks-live`
  - accepts live `url`, raw `HTML`, raw `JSON`, or structured `CSV/JSON` feeds
- `POST /api/connectors/pipeline/run`
  - runs municipal + market fusion in one step
  - accepts custom `municipalSources` and `marketSources` arrays

### Included live connector presets

- Municipal: `gmda-live`, `ghmc-live`, `bmrda-live`
- Market: `99acres-live`, `magicbricks-live`

### Local connector fixtures

Example local pages for connector testing are included in:

- `examples/connector-fixtures/municipal-portal.html`
- `examples/connector-fixtures/99acres-dwarka.html`
- `examples/connector-fixtures/magicbricks-sector150.html`

## Recommended upload fields

The uploader accepts aliases, but these fields work best:

- `title`
- `city`
- `state`
- `corridor`
- `latitude`
- `longitude`
- `pricePerSqft`
- `priceGrowthPct`
- `rentalYieldPct`
- `rentalAbsorptionPct`
- `listingDensityScore`
- `searchMomentumScore`
- `permitMomentumScore`
- `cluMomentumScore`
- `infrastructureBoostScore`
- `supplyRiskScore`
- `monthsToCatalyst`
- `priceToCityMedianRatio`
- `readyToMovePricePerSqft`
- `underConstructionPricePerSqft`
- `municipalSignals`
- `tags`

For `municipalSignals`, use a JSON array string when possible.

Example:

```json
[
  {
    "title": "Metro phase extension",
    "category": "metro",
    "status": "tendered",
    "impact": 0.92,
    "monthsToExecution": 18,
    "confidence": 84
  }
]
```

Sample upload file:

- `examples/urban-growth-sample.csv`

## Scoring model

Each zone is normalized and scored into:

- `municipalScore`
- `demandScore`
- `undervaluationScore`
- `riskScore`
- `growthVelocityScore`
- `projectedAppreciationPct`
- `projectionHorizonMonths`
- `marketPhase`

The model is intentionally explainable rather than opaque:

- municipal signals are weighted by category, status, timing, and confidence
- demand blends search momentum, rental absorption, price trend, and listing activity
- undervaluation rewards discount-to-ready-stock and affordability
- risk penalizes saturation, timeline delay, and overheating

## Demo data

The seeded demo includes example micro-markets across:

- Gurugram
- Hyderabad
- Pune
- Noida
- Chennai
- Navi Mumbai
- Bengaluru
- Jaipur
- Kolkata

These are illustrative investment profiles for MVP/demo use, not investment advice or verified municipal records.

## Deploy on Vercel

This repository is prepared for a single Vercel deployment:

- Frontend builds from `client/`
- Backend is exposed through root `api/` functions

Suggested Vercel settings:

- Framework Preset: `Vite`
- Install Command: `npm install --prefix server && npm install --prefix client`
- Build Command: `npm run vercel-build`
- Output Directory: `client/dist`

## Current AI layer

The product already includes:

1. An explainable predictive scoring engine
2. Municipal document parsing and signal extraction
3. Portal-style market feed harvesting
4. AI-generated zone memo summaries

## Next upgrades

Best follow-on milestones for a more production-grade version:

1. Scheduled live crawling for specific municipal and real-estate sites
2. Stronger OCR for scanned government PDFs
3. Time-series storage for price, rent, and search deltas
4. Zone boundary polygons instead of point markers
5. Training and validating a learned ranking model against historical appreciation
