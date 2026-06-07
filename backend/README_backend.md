# Backend — REPIF API

**REPIF** (Real Estate Prices In France) — REST API for apartment price predictions. Beta POC, starting with Haute-Garonne (department 31).

## Role in the product

- Receives prediction requests from the frontend
- Runs the ML model and returns an estimated price in euros
- Persists every prediction in PostgreSQL (history, analytics, future improvements)

## Stack

| Layer | Technology |
|---|---|
| Framework | FastAPI |
| ORM | SQLAlchemy |
| Database driver | psycopg2-binary |
| ML inference | scikit-learn + joblib |
| Server | Uvicorn |

## Project structure

```
backend/
├── app/
│   ├── main.py        # Routes, CORS, app bootstrap
│   ├── schemas.py     # Pydantic request/response models
│   ├── predictor.py   # Loads model.pkl and runs predictions
│   ├── database.py    # DB engine, session, get_db dependency
│   └── models.py      # SQLAlchemy Prediction table
├── model.pkl          # Serialized ML pipeline (committed for beta)
├── requirements.txt
├── Dockerfile
├── .dockerignore
├── .env.sample        # Template for secrets (copy to .env)
└── README_backend.md
```

## API endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/` | Health check |
| `POST` | `/predict` | Predict price from `postal_code`, `room_count`, `living_area` |
| `GET` | `/predictions` | List saved predictions (newest first) |
| `GET` | `/docs` | Swagger UI (auto-generated) |

### POST /predict — request body

```json
{
  "postal_code": "31000",
  "room_count": 3,
  "living_area": 65
}
```

### Response

```json
{
  "price": 148404.57
}
```

## Configuration

Copy `.env.sample` to `.env` and fill in values. **Never commit `.env`.**

| Variable | Purpose |
|---|---|
| `POSTGRES_USER` | PostgreSQL username |
| `POSTGRES_PASSWORD` | PostgreSQL password |
| `POSTGRES_DB` | Database name |
| `DATABASE_URL` | Full connection string for SQLAlchemy |

**Local dev** (uvicorn on host, Postgres in Docker):

```
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
```

**Backend in Docker** (Postgres on host):

```
DATABASE_URL=postgresql://user:password@host.docker.internal:5432/dbname
```

## Database (PostgreSQL)

The API expects a running PostgreSQL instance. In development, run it in Docker using the same `.env` (credentials are read by the official `postgres` image):

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
docker ps                          # check immo-pg is Up
docker start immo-pg               # start if stopped
docker logs immo-pg                # wait for "ready to accept connections"
docker exec -it immo-pg psql -U YOUR_USER -d YOUR_DB -c "SELECT COUNT(*) FROM predictions;"
```

(`YOUR_USER` / `YOUR_DB` = values from `.env`)

Tables are created automatically on API startup (`Base.metadata.create_all`).

## Run locally

```bash
cd backend
python -m venv .venv
source .venv/Scripts/activate   # Windows Git Bash
pip install -r requirements.txt
uvicorn app.main:app --reload
```

API: http://localhost:8000 — docs: http://localhost:8000/docs

## Run with Docker

```bash
cd backend
docker build -t repif-backend .
docker run -d --name repif-api -p 8000:8000 \
  --env-file .env \
  -e DATABASE_URL=postgresql://USER:PASS@host.docker.internal:5432/DB \
  repif-backend
```

## CORS

The frontend (`http://localhost:3000`) is allowed in development. Update `allow_origins` in `main.py` when deploying to production.

## Beta limitations

- Tables created via `create_all()` — no Alembic migrations yet
- Model file bundled in the image/repo (MLOps registry planned later)
- Single linear regression model — accuracy varies by area
