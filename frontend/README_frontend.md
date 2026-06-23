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

Request body: `property_type`, `address`, `sbati`, `nblocdep`, `dpe_median`, `annee_construction`. The backend geocodes the address via Géoplateforme before running the model.

## Configuration

Server-only env vars live in **gitignored** `.env.local`:

```bash
cd frontend
cp .env.example .env.local
```

| Variable | Purpose |
|---|---|
| `BACKEND_URL` | FastAPI base URL (used by route handlers only) |
| `BACKEND_JWT_PRIVATE_KEY` | PEM private key — signs short-lived JWTs sent to the backend |
| `BACKEND_JWT_TTL_SECONDS` | Token lifetime in seconds (default `300`) |
| `RATE_LIMIT_PREDICT_PER_MIN` | Max POST `/api/predict/*` per IP per minute (default `10`) |
| `RATE_LIMIT_PREDICTIONS_PER_MIN` | Max GET `/api/predictions` per IP per minute (default `60`) |

These variables are **not** exposed to the browser. Generate keys with `bash generate-jwt-keys.sh` from the repo root; set the public key on the backend (`BACKEND_JWT_PUBLIC_KEY`). Swagger (`/docs`) is controlled by **`ENABLE_DOCS`** on the backend — see [backend/README_backend.md](../backend/README_backend.md#configuration).

Rate limits apply in **Next.js middleware** (first layer) and **FastAPI** (second layer). The proxy forwards the client IP via `X-Forwarded-For`.

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
- User enters a postal address (geocoded server-side by the backend)
- No mobile-specific polish
- No ad integration yet

## Planned (post-beta)

- Address autocomplete (Géoplateforme)
- Loading skeletons and clearer error states
