# Backend — REPIF API

**REPIF** (Real Estate Prices In France) — REST API for apartment and house price estimates.

Beta POC: XGBoost models trained locally in `ml/`, copied into this service for inference.

## Role in the product

- Receives prediction requests (address + property features as JSON)
- **Geocodes** the address via [Géoplateforme](https://data.geopf.fr/geocodage/openapi)
- Runs the appropriate XGBoost model (apartment or house)
- Returns an estimated price in euros
- Persists every prediction in PostgreSQL

## Stack

| Layer | Technology |
|---|---|
| Framework | FastAPI |
| ORM | SQLAlchemy |
| Database | PostgreSQL (`psycopg2-binary`) |
| ML inference | XGBoost + joblib + pandas + httpx (geocoding) |
| Server | Uvicorn |

## Project structure

```
backend/
├── app/
│   ├── main.py        # Routes, CORS, DB bootstrap
│   ├── auth.py        # JWT RS256 middleware
│   ├── config.py      # ENABLE_DOCS and shared settings
│   ├── rate_limit.py  # Per-IP limits (slowapi)
│   ├── schemas.py     # Pydantic request/response models
│   ├── geocoding.py   # Address → lat/lon/INSEE (Géoplateforme BAN)
│   ├── predictor.py   # Loads .joblib models, runs inference
│   ├── database.py    # Engine, session, get_db
│   └── models.py      # SQLAlchemy Prediction table
├── models_back/       # Serialized XGBoost models (not in Git — see README there)
├── requirements.txt
├── Dockerfile
├── .dockerignore
├── .env.sample
└── README_backend.md
```

## Models

Inference uses two files in `models_back/`. Filenames are set via env (`MODEL_APARTMENT`, `MODEL_HOUSE`):

```
models_back/apartment_dev_YYYYMMDD_HHMMSS.joblib
models_back/house_dev_YYYYMMDD_HHMMSS.joblib
```

**Deploy a new model version**

1. Train and save in `ml/` → `ml/models/`
2. Copy the `.joblib` files into `backend/models_back/`
3. Update `MODEL_APARTMENT` / `MODEL_HOUSE` in `.env` (local) or Coolify **Production** env
4. Deliver files to the running environment and restart the API:
   - **Local / Compose:** files in `backend/models_back/` on the host (bind mount) — restart the backend service
   - **Coolify:** SCP to the VPS, copy into the persistent volume, redeploy — full procedure in [`models_back/README.md`](models_back/README.md#coolify--deliver-joblib-to-persistent-storage)

Predictions are in **log-price** inside the model; `predictor.py` applies `exp()` before returning euros.

> Use `float(...)` on the result before SQL insert — psycopg2 does not accept `numpy.float32`.

## API endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/` | Health check |
| `POST` | `/predict/apartment` | Apartment price estimate |
| `POST` | `/predict/house` | House price estimate |
| `GET` | `/predictions` | Saved predictions (newest first) |
| `GET` | `/docs` | Swagger UI (only if `ENABLE_DOCS=true`) |

### Request body (`PredictInput`)

Same schema for both routes. `property_type` must match the endpoint (`APARTMENT` vs `HOUSE`).

```json
{
  "property_type": "APARTMENT",
  "address": "10 rue de la Pomme 31000 Toulouse",
  "sbati": 102.55,
  "nblocdep": 0,
  "dpe_median": 4,
  "annee_construction": 1980
}
```

| Field | Meaning |
|---|---|
| `address` | Postal address — geocoded server-side to `lat`, `lon`, `l_codinsee` |
| `sbati` | Built area (m²) — DVF+ field name |
| `nblocdep` | Number of outbuildings / dependencies (not room count) |
| `dpe_median` | Energy class as integer 1–7 (A=1 … G=7) |
| `annee_construction` | Construction year |

Stored in the database after geocoding: **`address`** = BAN normalized label (best match), plus `lat`, `lon`, `l_codinsee`, input fields and `predicted_price`.

### Response

```json
{
  "price": 450637.0,
  "input_address": "10 rue de la pomme toulouse",
  "geocoded_address": "10 Rue de la Pomme 31000 Toulouse",
  "geocode_score": 0.87
}
```

## Configuration

Copy `.env.sample` to `.env`. **Never commit `.env`.**

| Variable | Purpose |
|---|---|
| `POSTGRES_USER` | PostgreSQL username |
| `POSTGRES_PASSWORD` | PostgreSQL password |
| `POSTGRES_DB` | Database name |
| `DATABASE_URL` | Full SQLAlchemy connection string |
| `BACKEND_JWT_PUBLIC_KEY` | PEM public key — when set, routes except `GET /` require a valid RS256 JWT |
| `BACKEND_JWT_ISSUER` | Expected JWT `iss` (default `repif-frontend`) |
| `BACKEND_JWT_AUDIENCE` | Expected JWT `aud` (default `repif-backend`) |
| `ENABLE_DOCS` | `true` → `/docs` enabled; `false` → disabled. Default if unset: **`false`**. Compose sets `true` for local dev; use `false` on Coolify prod. |
| `MODEL_APARTMENT` | Filename in `models_back/` (default `apartment_dev_20260621_220900.joblib`) |
| `MODEL_HOUSE` | Filename in `models_back/` (default `house_dev_20260621_220900.joblib`) |
| `MODEL_METRICS` | Metrics JSON in `models_back/` (default `metrics_dev.json`) — supplies `mape_pct` for indicative price ranges |
| `RATE_LIMIT_PREDICT` | Max prediction requests per IP (default `10/minute`) — slowapi format |
| `RATE_LIMIT_PREDICTIONS` | Max history list requests per IP (default `60/minute`) |

Generate keys: `bash generate-jwt-keys.sh` from the repo root. Put the **private** key in Next.js (`BACKEND_JWT_PRIVATE_KEY`), the **public** key here. If `BACKEND_JWT_PUBLIC_KEY` is unset, the API stays open (dev only — warning at startup).

**Local dev** (Uvicorn on host, Postgres in Docker):

```
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
```

**Backend in Docker Compose** (Postgres service `db`):

```
DATABASE_URL=postgresql://user:password@db:5432/dbname
```

Place model files in `backend/models_back/` on the host (Compose bind-mounts that folder into the container). Copy from training output if needed:

```bash
cp ml/models/apartment_dev_*.joblib backend/models_back/
cp ml/models/house_dev_*.joblib backend/models_back/
cp ml/models/metrics_dev_*.json backend/models_back/
```

Optional in root `.env`: `MODEL_APARTMENT` / `MODEL_HOUSE` to pick another filename without rebuilding.

**Backend alone in Docker** (Postgres on host):

```
DATABASE_URL=postgresql://user:password@host.docker.internal:5432/dbname
```

## Database (PostgreSQL)

Prefer [Docker Compose from the repo root](../README.md#run-with-docker-compose) — it starts Postgres (`db` service) and creates the `predictions` table on API startup.

Standalone Postgres (local dev without Compose):

```bash
cd backend
docker run -d \
  --name immo-pg \
  --env-file .env \
  -p 5432:5432 \
  postgres:16
```

Useful commands:

```bash
docker ps
docker start immo-pg
docker logs immo-pg
docker exec -it immo-pg psql -U YOUR_USER -d YOUR_DB -c "\dt"
docker exec -it immo-pg psql -U YOUR_USER -d YOUR_DB -c "SELECT COUNT(*) FROM predictions;"
```

The `predictions` table is created on API startup via `Base.metadata.create_all()`.

If you change column definitions, drop the table (or recreate the database) — `create_all` does not migrate existing tables:

```sql
DROP TABLE predictions;
```

## Run locally

```bash
cd backend
python -m venv .venv
source .venv/Scripts/activate   # Windows Git Bash
pip install -r requirements.txt
uvicorn app.main:app --reload
```

API: http://localhost:8000 — docs: http://localhost:8000/docs

### Test the API when JWT auth is enabled

Requires `ENABLE_DOCS=true` (default in local Compose).

1. Generate a JWT: `python generate-test-jwt.py` (private key in `.env` or `repif-jwt-private.pem`).
2. Open http://localhost:8000/docs → **Authorize** → paste the token.
3. Or with curl:

   ```bash
   TOKEN=$(python generate-test-jwt.py)
   curl -H "Authorization: Bearer $TOKEN" http://localhost:8000/predictions
   ```

**Production (Coolify):** `ENABLE_DOCS=false` — `/docs` is disabled. See [Coolify production](#coolify-production) below.

**Local without JWT:** remove `BACKEND_JWT_PUBLIC_KEY` from `.env` and restart the backend (dev only).

If `pip` fails with a wrong venv path, use:

```bash
python -m pip install -r requirements.txt
```

Prefer [Docker Compose from the repo root](../README.md#run-with-docker-compose) for the full stack.

## Coolify production

Deploy as a **separate Dockerfile application** in the same Coolify project/environment as the frontend and Postgres.

### Application settings

| Setting | Value |
|---|---|
| Build Pack | Dockerfile |
| Base Directory | `/backend` |
| Dockerfile Location | `/Dockerfile` |
| Port | **8000** |
| Persistent Storage | **Volume Mount** → `/backend/models_back` |

Use **Production Environment Variables** only (Preview is for PR deployments).

### Environment variables (Production)

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DBNAME
BACKEND_JWT_PUBLIC_KEY=<PEM public key>
BACKEND_JWT_ISSUER=repif-frontend
BACKEND_JWT_AUDIENCE=repif-backend
ENABLE_DOCS=false
MODEL_APARTMENT=apartment_dev_20260621_220900.joblib
MODEL_HOUSE=house_dev_20260621_220900.joblib
MODEL_METRICS=metrics_dev_20260716_120000.json
```

**`DATABASE_URL`:** Coolify often generates `postgres://…`. SQLAlchemy requires **`postgresql://`** (replace the scheme only; keep user, password, host, port, db).

Link the Postgres resource to the backend or paste the **internal** hostname Coolify provides (not `localhost` from inside the container).

**JWT public key:** multiline PEM or single line with `\n` — same pair as `BACKEND_JWT_PRIVATE_KEY` on the frontend.

**Models:** not in Git. Upload `.joblib` files to the persistent volume before the first successful start — see [`models_back/README.md`](models_back/README.md#coolify--deliver-joblib-to-persistent-storage).

### Custom domain and HTTPS

1. **DNS** — type **A** to the VPS IP, e.g. `api.hawk-prix-immo.example.com`.
2. **Coolify → Domains:**

   ```
   https://api.hawk-prix-immo.example.com
   ```

3. **Advanced → Force HTTPS** → Save → **Redeploy**.

4. Health check: `curl https://api.hawk-prix-immo.example.com/` → `{"status":"ok"}`.

Set the frontend’s `BACKEND_URL` to this HTTPS URL (see [frontend/README_frontend.md](../frontend/README_frontend.md#coolify-production)).

### Troubleshooting

| Symptom | Fix |
|---|---|
| `NoSuchModuleError: sqlalchemy.dialects:postgres` | Change `postgres://` → `postgresql://` in `DATABASE_URL` |
| `FileNotFoundError` for `.joblib` | Copy models into the volume, then redeploy |
| Container Exited before upload | Use SSH/SCP — Coolify terminal unavailable while down |
| `401` from frontend | Check JWT public/private pair and issuer/audience |

## CORS

The frontend origin `http://localhost:3000` is allowed in development. Update `allow_origins` in `main.py` for production.

## Beta limitations

- No Alembic migrations — schema changes require manual table drop
- Model files copied by hand from `ml/models/`
- Separate apartment / house models — same inputs can yield very different prices (different markets)
- Geocoding requires internet access to `data.geopf.fr` (50 req/s/IP)
- Predictions are indicative, not certified appraisals — see [ml/README_ml.md](../ml/README_ml.md)
