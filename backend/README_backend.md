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
│   ├── schemas.py     # Pydantic request/response models
│   ├── geocoding.py   # Address → lat/lon/INSEE (Géoplateforme BAN)
│   ├── predictor.py   # Loads .joblib models, runs inference
│   ├── database.py    # Engine, session, get_db
│   └── models.py      # SQLAlchemy Prediction table
├── models_back/       # Serialized XGBoost models (not committed by default)
├── requirements.txt
├── Dockerfile
├── .dockerignore
├── .env.sample
└── README_backend.md
```

## Models

Inference uses two files in `models_back/` (paths set in `predictor.py`):

```
models_back/apartment_dev_YYYYMMDD_HHMMSS.joblib
models_back/house_dev_YYYYMMDD_HHMMSS.joblib
```

**Deploy a new model version**

1. Train and save in `ml/` → `ml/models/`
2. Copy the `.joblib` files into `backend/models_back/`
3. Update filenames in `predictor.py` if the timestamp changed
4. Restart the API (or rebuild the Docker image)

Predictions are in **log-price** inside the model; `predictor.py` applies `exp()` before returning euros.

> Use `float(...)` on the result before SQL insert — psycopg2 does not accept `numpy.float32`.

## API endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/` | Health check |
| `POST` | `/predict/apartment` | Apartment price estimate |
| `POST` | `/predict/house` | House price estimate |
| `GET` | `/predictions` | Saved predictions (newest first) |
| `GET` | `/docs` | Swagger UI |

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

Stored in the database after geocoding: `address`, `lat`, `lon`, `l_codinsee`, plus the input fields and `predicted_price`.

### Response

```json
{
  "price": 450637.0
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

**Local dev** (Uvicorn on host, Postgres in Docker):

```
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
```

**Backend in Docker Compose** (Postgres service `db`):

```
DATABASE_URL=postgresql://user:password@db:5432/dbname
```

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

If `pip` fails with a wrong venv path, use:

```bash
python -m pip install -r requirements.txt
```

Prefer [Docker Compose from the repo root](../README.md#run-with-docker-compose) for the full stack.

## CORS

The frontend origin `http://localhost:3000` is allowed in development. Update `allow_origins` in `main.py` for production.

## Beta limitations

- No Alembic migrations — schema changes require manual table drop
- Model files copied by hand from `ml/models/`
- Separate apartment / house models — same inputs can yield very different prices (different markets)
- Geocoding requires internet access to `data.geopf.fr` (50 req/s/IP)
- Predictions are indicative, not certified appraisals — see [ml/README_ml.md](../ml/README_ml.md)
