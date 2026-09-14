# REPIF — Real Estate Prices In France

Web app that estimates **apartment and house** sale prices from property features. Built on official French open data (DVF+ and ADEME DPE).

**Status: beta POC** — national training data, indicative prices only. Not production-ready.

## What it does

1. Client sends an **address** and property features (surface, DPE, etc.)
2. Backend **geocodes** the address (Géoplateforme BAN), then runs **XGBoost**
3. Estimated price in euros is returned and stored in PostgreSQL

## Architecture

```
┌─────────────┐     HTTP      ┌─────────────┐     SQL      ┌─────────────┐
│   frontend  │ ────────────► │   backend   │ ───────────► │  PostgreSQL │
│   Next.js   │               │   FastAPI   │              │             │
└─────────────┘               └──────┬──────┘              └─────────────┘
                                     │
                                     │ geocode + infer
                                     ▼
                              ┌─────────────────────┐
                              │  FastAPI + geocoding │
                              │  models_back/*.joblib│
                              └─────────────────────┘
                                     ▲
                                     │ trained from
                              ┌─────────────────────┐
                              │  DVF+ + DPE (ml/)   │
                              └─────────────────────┘
```

Monorepo: each service has its own folder, dependencies, and README.

## Repository layout

```
├── frontend/       Web UI
├── backend/        REST API, inference, persistence
├── ml/             Training pipeline (DVF+ + DPE → XGBoost)
├── docker-compose.yml
├── generate-jwt-keys.sh   # One-off: RSA key pair for Next ↔ API JWT
├── generate-test-jwt.py   # Dev: print a JWT for Swagger / curl
├── .env.example    # Template for Compose (copy to .env)
└── README.md       You are here
```

## Documentation

| Component | Details |
|---|---|
| [backend/README_backend.md](backend/README_backend.md) | API, models, database, [Coolify prod](backend/README_backend.md#coolify-production) |
| [frontend/README_frontend.md](frontend/README_frontend.md) | UI, local dev, [Coolify prod](frontend/README_frontend.md#coolify-production) |
| [backend/models_back/README.md](backend/models_back/README.md) | ML model delivery (SCP + volume on Coolify) |
| [ml/README_ml.md](ml/README_ml.md) | Training, features, limitations |

## Run with Docker Compose

Orchestrates **PostgreSQL**, the **API**, and the **frontend** from the repo root.

### Prerequisites

1. Copy the env template:

   ```bash
   cp .env.example .env
   ```

   Edit `.env` if needed. For Compose, `DATABASE_URL` must use the service name **`db`** as host (already set in `.env.example`).

   Optional but recommended for a realistic stack: JWT keys (`bash generate-jwt-keys.sh`) and `ENABLE_DOCS=true` for local Swagger. See [backend/README_backend.md](backend/README_backend.md#configuration).

2. Copy trained models into the backend image context:

   ```bash
   mkdir -p backend/models_back
   cp ml/models/apartment_dev_*.joblib backend/models_back/
   cp ml/models/house_dev_*.joblib backend/models_back/
   ```

   Update `MODEL_APARTMENT` / `MODEL_HOUSE` in `.env` if your timestamps differ.

### Start the stack

Full stack (UI built for production inside Docker):

```bash
docker compose up --build
```

**Frontend dev on the host** (hot reload, less Docker RAM): API + DB only, then `npm run dev` in `frontend/` — see [frontend/README_frontend.md](frontend/README_frontend.md#run-locally).

```bash
docker compose up db backend
```

| Service | URL |
|---|---|
| App | http://localhost:3000 |
| API docs | http://localhost:8000/docs (if `ENABLE_DOCS=true`) |
| Postgres | `localhost:5432` (credentials from `.env`) |

Stop:

```bash
docker compose down
```

Remove the database volume (fresh DB):

```bash
docker compose down -v
```

### How it is wired

```
Browser  →  Next.js :3000  (/api/*)  →  FastAPI :8000
                ↑                           ↑
         no backend URL              BACKEND_URL
         in the browser              (+ JWT RS256 server-to-server)
```

```
docker-compose.yml
├── db          postgres:16
├── backend     build ./backend  →  port 8000
└── frontend    build ./frontend  →  port 3000
                  environment: BACKEND_URL=http://backend:8000
```

- **Backend → Postgres:** `DATABASE_URL` in `.env` (host `db` inside the network).
- **Frontend → Backend:** server-side proxy via `BACKEND_URL` (Docker network hostname `backend`). No public API URL in the browser bundle.

**JWT (Next → API):** run `bash generate-jwt-keys.sh`, then set both keys in root `.env` (Compose reads it for substitution). Only the **private** key is injected into the frontend container; only the **public** key into the backend.

**Swagger:** `ENABLE_DOCS=true` in `.env` for local dev (default in Compose). On **Coolify prod**, set `ENABLE_DOCS=false` on the backend service — `/docs` is then disabled even if the API has a public domain.

**Rate limits:** per client IP on predictions (`10/min` default) and history (`60/min` default). Configured in `.env` — see [backend/README_backend.md](backend/README_backend.md#configuration).

Per-service notes: [backend/README_backend.md](backend/README_backend.md), [frontend/README_frontend.md](frontend/README_frontend.md).

## Deploy on Coolify (beta VPS)

Three Coolify resources in the same **project** and **production** environment:

| Resource | Build | Port | Domain (example) |
|---|---|---|---|
| PostgreSQL | Coolify database | 5432 | internal only |
| Backend | Dockerfile `/backend` | **8000** | `https://api.pricelens.example.com` |
| Frontend | Dockerfile `/frontend` | **3000** | `https://www.pricelens.example.com` |

Checklist:

1. **Postgres** — note credentials; set backend `DATABASE_URL` with scheme **`postgresql://`** (not `postgres://`).
2. **Backend** — persistent volume on `/backend/models_back`; deliver **six ml_v2 artifacts** (2× `.joblib`, 2× metrics JSON, 2× commune lookup JSON) via SSH — [models_back/README.md](backend/models_back/README.md#coolify--deliver-ml_v2-artifacts-to-persistent-storage).
3. **Backend** — `ENABLE_DOCS=false`, JWT **public** key, all `MODEL_*` env vars (see [backend README](backend/README_backend.md#coolify-production)).
4. **Frontend** — JWT **private** key (required for all API proxy calls, including `/api/metrics` on About); `BACKEND_URL` = backend **HTTPS** URL.
5. **Redeploy** backend and frontend after env or model changes.
6. **DNS** (e.g. Infomaniak) — A records for frontend and API subdomains → VPS IP; enable **Force HTTPS** in Coolify; redeploy after domain changes.

Env vars go in **Production Environment Variables**, not Preview.

Details: [backend/README_backend.md#coolify-production](backend/README_backend.md#coolify-production), [frontend/README_frontend.md#coolify-production](frontend/README_frontend.md#coolify-production).

## Run locally (without Compose)

You can also run each service on the host — see sub-project READMEs.

| Service | Default URL |
|---|---|
| App | http://localhost:3000 |
| API docs | http://localhost:8000/docs (if `ENABLE_DOCS=true`) |

1. Copy `backend/.env.sample` → `backend/.env` (use `@localhost` in `DATABASE_URL`)
2. Copy `frontend/.env.example` → `frontend/.env.local` (`BACKEND_URL=http://localhost:8000`)
3. Copy the six ml_v2 prod files to `backend/models_back/` and set `MODEL_*` in `.env` (see [models_back/README.md](backend/models_back/README.md))
4. Start Postgres, backend, then frontend

## Beta scope

| Area | Choice |
|---|---|
| ML models | XGBoost prod models (`ml_v2`, ~100k recent sales, DPE + commune €/m²) |
| Inference | Separate apartment / house models |
| API | `POST /predict/apartment`, `POST /predict/house` (input: `address`, not lat/lon) |
| Geocoding | Géoplateforme BAN in the backend (`geocoding.py`) |
| Output | Indicative market index — not an official appraisal |

## Roadmap (post-beta)

- CI/CD (GitHub Actions → registry → VPS)
- Production retraining (e.g. GCE) and model registry
- Alembic migrations for the database
- Address autocomplete in the UI (Géoplateforme)

## License

This project’s source code is licensed under the [MIT License](LICENSE).

Training data (DVF+, DPE, etc.) remains subject to the terms of the respective open-data publishers (Cerema, ADEME, …).
