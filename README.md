# REPIF — Real Estate Prices In France

Web app that estimates **apartment and house** sale prices from property features. Built on official French open data (DVF+ and ADEME DPE).

**Status: beta POC** — national training data, indicative prices only. Not production-ready.

## What it does

1. Client sends property features (surface, location, DPE, etc.) to the API
2. Backend runs an **XGBoost** model (separate models for apartments and houses)
3. Estimated price in euros is returned and stored in PostgreSQL

## Architecture

```
┌─────────────┐     HTTP      ┌─────────────┐     SQL      ┌─────────────┐
│   frontend  │ ────────────► │   backend   │ ───────────► │  PostgreSQL │
│   Next.js   │               │   FastAPI   │              │             │
└─────────────┘               └──────┬──────┘              └─────────────┘
                                     │
                                     │ loads at startup
                                     ▼
                              ┌─────────────────────┐
                              │  models_back/*.joblib │
                              │  (from ml/ pipeline)  │
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
└── README.md       You are here
```

## Documentation

| Component | Details |
|---|---|
| [backend/README_backend.md](backend/README_backend.md) | API, models, database, Docker |
| [frontend/README_frontend.md](frontend/README_frontend.md) | UI, local dev, build |
| [ml/README_ml.md](ml/README_ml.md) | Training, features, limitations |

## Run the stack (overview)

You need **PostgreSQL**, the **API**, and optionally the **frontend**.

| Service | Default URL |
|---|---|
| App | http://localhost:3000 |
| API docs | http://localhost:8000/docs |

1. Copy `backend/.env.sample` → `backend/.env`
2. Copy trained `.joblib` files from `ml/models/` → `backend/models_back/` (see backend README)
3. Start Postgres, then the API, then the frontend

Details and commands live in each sub-project README.

> **Note:** The frontend form still targets the old `/predict` API in places. Use **Swagger** (`/docs`) to test the new endpoints until the UI is updated.

## Beta scope

| Area | Choice |
|---|---|
| ML models | XGBoost dev models (~100k recent sales, hyperparameter search) |
| Inference | Separate apartment / house models |
| API | `POST /predict/apartment`, `POST /predict/house` |
| Output | Indicative market index — not an official appraisal |

## Roadmap (post-beta)

- Align frontend with the new API contract
- `docker-compose` for Postgres + API + frontend
- CI/CD (GitHub Actions → registry → VPS)
- Production retraining (e.g. GCE) and model registry
- Alembic migrations for the database

## License

TBD.
