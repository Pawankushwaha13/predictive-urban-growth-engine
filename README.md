# Strategic Fusion Dashboard

Web-based MERN intelligence dashboard for fusing `OSINT`, `HUMINT`, and `IMINT` onto one interactive terrain map.

## What is included

- Express backend with MongoDB-ready storage and Mongoose data model
- Demo fallback mode so the app still opens even if MongoDB is not configured yet
- Manual ingestion for `CSV`, `Excel`, `JSON`, and `JPG/JPEG/PNG` imagery
- Connector APIs for syncing intelligence from MongoDB collections and AWS S3
- React dashboard with:
  - terrain-style geospatial map
  - source filters and search
  - hover popups with imagery and metadata
  - side-panel inspection view
  - drag-and-drop ingestion workflows

## Project structure

```text
.
|-- client/     # React + Vite dashboard
|-- server/     # Express API + ingestion + sync connectors
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

Minimum backend config for full MERN mode:

```env
PORT=5000
CLIENT_URL=http://localhost:5173
DATABASE_URI=mongodb://127.0.0.1:27017/strategic-fusion-dashboard
```

If `DATABASE_URI` is missing or MongoDB is offline, the API runs in `demo fallback` mode with built-in sample records.

### 3. Start the stack

```bash
npm run dev
```

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5000`

## API overview

### Intelligence

- `GET /api/intelligence`
- `GET /api/intelligence/summary`
- `POST /api/intelligence/seed`

### Manual ingestion

- `POST /api/ingestion/manual`
  - multipart form field: `file`
  - supports `.csv`, `.xls`, `.xlsx`, `.json`
- `POST /api/ingestion/images`
  - multipart form field: `images`
  - supports `.jpg`, `.jpeg`, `.png`

### Cloud connectors

- `POST /api/connectors/mongodb/sync`
- `POST /api/connectors/s3/sync`

## Expected structured data fields

The manual structured uploader recognizes common aliases, but these fields work best:

- `title`
- `description`
- `sourceType`
- `locationName`
- `latitude`
- `longitude`
- `eventTime`
- `confidence`
- `tags`
- `mediaUrl`

Example CSV:

```csv
title,description,sourceType,locationName,latitude,longitude,eventTime,confidence,tags
Checkpoint activity,Portable barriers deployed,HUMINT,Checkpoint Delta,28.6139,77.2090,2026-04-18T01:45:00Z,81,"checkpoint, barriers"
Social chatter on convoy,Convoy references rising,OSINT,Transit Corridor Alpha,24.8607,67.0011,2026-04-18T03:20:00Z,72,"convoy, osint"
```

## MongoDB sync payload example

```json
{
  "uri": "mongodb+srv://username:password@cluster.mongodb.net/",
  "database": "intel",
  "collection": "osint_reports",
  "limit": 100
}
```

## S3 sync payload example

```json
{
  "region": "ap-south-1",
  "bucket": "fusion-intel-bucket",
  "prefix": "osint/",
  "limit": 50,
  "defaults": {
    "latitude": 26.9124,
    "longitude": 75.7873,
    "locationName": "Default Map Anchor"
  }
}
```

## Notes

- S3 image indexing expects coordinates either in object metadata (`latitude`, `longitude`) or in the `defaults` payload.
- Uploaded imagery is stored in `server/uploads/`.
- `POST /api/intelligence/seed` loads repeat-safe sample data.

## Deploy on Vercel

This repository is now prepared for a single Vercel deployment:

- Frontend: built from `client/` and served from `client/dist`
- Backend: exposed through Vercel Functions in the root `api/` directory

### Important production note

On Vercel, function filesystems are read-only except for temporary `/tmp` scratch space, and Express static serving is not used for production assets. That means local `server/uploads/` storage is not suitable for deployed image uploads.

For live image upload support on Vercel, set these environment variables:

```env
DATABASE_URI=your-mongodb-connection-string
CLIENT_URL=https://your-project-name.vercel.app
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_S3_BUCKET=your-bucket-name
AWS_S3_UPLOAD_PREFIX=uploads
```

Optional:

```env
AWS_S3_UPLOAD_BUCKET=separate-upload-bucket
AWS_S3_PUBLIC_BASE_URL=https://your-cdn-or-bucket-public-base-url
```

### Vercel dashboard settings

Use these values in the Vercel project if it does not auto-detect them:

- Framework Preset: `Vite`
- Install Command: `npm install --prefix server && npm install --prefix client`
- Build Command: `npm run vercel-build`
- Output Directory: `client/dist`

### Deploy steps

1. Push this project to GitHub, GitLab, or Bitbucket.
2. Import the repository into Vercel.
3. Add the environment variables listed above in the Vercel dashboard.
4. Deploy.
5. After the first deploy, call `POST /api/intelligence/seed` once if you want sample nodes in production.

### After deployment

- Frontend will use same-origin `/api` automatically in production.
- API routes remain available under `/api/...`.
- Image uploads will persist only when S3 environment variables are configured.
