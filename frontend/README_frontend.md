# Frontend — REPIF

**REPIF** (Real Estate Prices In France) — web UI for property price estimates. **Beta POC**, minimal single-page app.

## Role in the product

- User-facing entry point for the beta
- Collects property features and calls the backend API
- Displays the estimated price and recent predictions from the database

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| UI | React 19 + TypeScript |
| Styling | Tailwind CSS 4 |

## Project structure

```
frontend/
├── app/
│   ├── page.tsx       # Main page: form + result + history
│   ├── layout.tsx     # Root layout and metadata
│   └── globals.css    # Global styles
├── public/
├── package.json
└── README_frontend.md
```

## API integration

The browser calls **Next.js route handlers** (same origin). They proxy to FastAPI server-side:

| Browser | Next.js route | Backend |
|---|---|---|
| `GET /api/predictions` | → | `GET /predictions` |
| `POST /api/predict/apartment` | → | `POST /predict/apartment` |
| `POST /api/predict/house` | → | `POST /predict/house` |

Implementation: `app/api/**/route.ts` and `lib/backend.ts`.

## Configuration

Server-only env vars live in **gitignored** `.env.local`:

```bash
cd frontend
cp .env.example .env.local
```

| Variable | Purpose |
|---|---|
| `BACKEND_URL` | FastAPI base URL (used by route handlers only) |
| `BACKEND_API_TOKEN` | Optional `Authorization: Bearer` token for the backend |

These variables are **not** exposed to the browser. When you add auth on the backend, set `BACKEND_API_TOKEN` here (or in Compose / hosting env at **runtime**).

**Docker Compose:** `BACKEND_URL=http://backend:8000` is set in `docker-compose.yml` for the frontend service.

**Standalone container:**

```bash
docker run -d --name repif-web -p 3000:3000 \
  -e BACKEND_URL=http://host.docker.internal:8000 \
  repif-frontend
```

## Prerequisites

- Node.js 18+ (project tested with Node 24)
- Backend API running on port 8000 (reachable from the Next.js server via `BACKEND_URL`)

## Run locally

```bash
cd frontend
npm install
npm run dev
```

App: http://localhost:3000

## Build for production

```bash
npm run build
npm start
```

## Run with Docker

Use [Docker Compose from the repo root](../README.md#run-with-docker-compose) to run the full stack.

Standalone image (set backend URL at **runtime**):

```bash
cd frontend
docker build -t repif-frontend .
docker run -d --name repif-web -p 3000:3000 \
  -e BACKEND_URL=http://host.docker.internal:8000 \
  repif-frontend
```

## Beta limitations

- Single page — no routing, auth, or accounts
- User must provide coordinates and INSEE code (no geocoding yet)
- No mobile-specific polish
- No ad integration yet

## Planned (post-beta)

- Geocoding from address or postal code
- Loading skeletons and clearer error states
