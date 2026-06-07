# REPIF — Real Estate Prices In France

Web app that estimates apartment prices from a few inputs (postal code, living area, number of rooms). Built on official French transaction data (DVF).

**Status: beta POC** — Haute-Garonne (department 31) only. Not production-ready.

## What it does

1. User enters apartment details on the web UI
2. Backend runs a linear regression model trained on DVF sales
3. Estimated price is returned and stored in PostgreSQL

## Architecture

```
┌─────────────┐     HTTP      ┌─────────────┐     SQL      ┌─────────────┐
│   frontend  │ ────────────► │   backend   │ ───────────► │  PostgreSQL │
│   Next.js   │               │   FastAPI   │              │             │
└─────────────┘               └──────┬──────┘              └─────────────┘
                                     │
                                     │ loads at startup
                                     ▼
                              ┌─────────────┐
                              │  model.pkl  │  ← trained in ml/
                              └─────────────┘
                                     ▲
                                     │ trained from
                              ┌─────────────┐
                              │  data/dvf   │
                              └─────────────┘
```

Monorepo: each service lives in its own folder with its own dependencies and README.

## Repository layout

```
├── frontend/     Web UI
├── backend/      API + model inference + persistence
├── ml/           Training pipeline (notebook → model.pkl)
├── data/         DVF source data (not committed — see data README)
└── README.md     You are here
```

## Documentation

| Component | Details |
|---|---|
| [backend/README_backend.md](backend/README_backend.md) | API, database, Docker, configuration |
| [frontend/README_frontend.md](frontend/README_frontend.md) | UI, local dev, build |
| [ml/README_ml.md](ml/README_ml.md) | Model training, features, performance |
| [data/README_data.md](data/README_data.md) | DVF source, download, cleaning rules |

## Run the stack (overview)

You need **PostgreSQL**, the **API**, and the **frontend** running. Exact commands, env vars, and Docker notes are in each sub-project README.

| Service | Default URL |
|---|---|
| App | http://localhost:3000 |
| API docs | http://localhost:8000/docs |

Copy `backend/.env.sample` to `backend/.env` before starting (secrets are never committed).

## Roadmap (post-beta)

- Expand beyond department 31
- Ad-supported monetization on the frontend
- `docker-compose` to orchestrate all services
- CI/CD deployment (GitHub Actions → container registry → VPS)
- MLOps: automated retraining when new DVF data is published

## License

TBD.
