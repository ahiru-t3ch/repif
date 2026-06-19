# ML — REPIF model

**REPIF** (Real Estate Prices In France) — machine learning pipeline for apartment price estimation. Trained on **DVF** data (see `data/README_data.md`). Beta: Haute-Garonne (31).

## Role in the product

Produces `model.pkl` — a scikit-learn **Pipeline** (preprocessing + linear regression) loaded by `backend/app/predictor.py` at API startup.

## Stack

| Layer | Technology |
|---|---|
| Language | Python 3.14 |
| ML | scikit-learn (LinearRegression) |
| Data | pandas |
| Serialization | joblib |
| Exploration | Jupyter (ipykernel) |

## Project structure

```
ml/
├── notebooks/
│   └── data_exploration.ipynb   # Data cleaning, EDA, training experiments
├── train.py                     # (planned) Scriptable training for CI/MLOps
├── requirements.txt
└── README_ml.md
```

## Model (beta)

| Item | Value |
|---|---|
| Algorithm | Linear regression |
| Features | `living_area`, `room_count`, `postal_code` (one-hot) |
| Target | `price` (EUR, no log transform) |
| Preprocessing | StandardScaler (numeric) + OneHotEncoder (postal code) |
| Typical performance | R² ~0.55–0.60, MAE ~35–40 k€ (depends on cleaning) |

Output artifact: `backend/model.pkl` (copied or dumped after training).

## Setup

```bash
cd ml
python -m venv .venv
source .venv/Scripts/activate   # Windows Git Bash
pip install -r requirements.txt
pip install ipykernel           # for Jupyter in VS Code / Cursor
```

## Workflow

1. Ensure `data/dvf.csv` exists (department 31)
2. Open `notebooks/data_exploration.ipynb`
3. Clean data, train pipeline, evaluate (R², MAE)
4. Serialize the final pipeline:

```python
import joblib
joblib.dump(model, "../backend/model.pkl")
```

5. Rebuild/restart the backend so it loads the new model

## Key data decisions

- **Apartments only** — houses follow different pricing logic
- **Single-lot sales** (`lot_count == 1`) — avoids DVF multi-line transaction noise
- **Deduplication by `id_mutation`** — one price per sale
- **Postal code as categorical** — captures location better than lat/long in linear models
- **Sale year** tested but not kept in beta (did not improve R²)

## DVF+ exploration database (Docker)

An optional **PostGIS** database (in `db_dvf_plus/`) to explore the richer
**DVF+ open-data** model (one row = one sale, geometries, dedicated schema).
Fully isolated from the application DB: own image, own volume, host port **5433**.

Source data lives in `db_dvf_plus/dumps/` (gitignored). The `.sql` files are
loaded automatically on the **first** container start, in order:
`01_extensions.sql` (PostGIS) then `02_load.sh` (init → annexe → departments).

Run all commands from the repo root.

```bash
# 1. Build the image
docker build -t dvf-plus-db ml/db_dvf_plus

# 2. Start the container (mounts the .sql folder to /dumps, host port 5433)
docker run -d --name dvf-plus-db -p 5433:5432 -v dvf_plus_data:/var/lib/postgresql/data -v "${PWD}/ml/db_dvf_plus/dumps/R76_Occitanie/DVF_PLUS_2026_1_SQL_R076_ED251/1_DONNEES_LIVRAISON:/dumps:ro" dvf-plus-db

# 3. Follow the load (long: ~1-2 h for the whole Occitanie region)
docker logs -f dvf-plus-db

# 4. Verify once finished
docker exec dvf-plus-db psql -U dvf_plus -d dvf_plus -c "\dn"
docker exec dvf-plus-db psql -U dvf_plus -d dvf_plus -c "SELECT count(*) FROM dvf_plus_2026_1.dvf_plus_mutation;"

# 5. Reload from scratch (init scripts only run on an empty volume)
docker rm -f dvf-plus-db
docker volume rm dvf_plus_data
```

Connection: host `localhost`, port `5433`, database `dvf_plus`, user `dvf_plus`,
password `dvf_plus`. Schema: `dvf_plus_2026_1` (tables prefixed `dvf_plus_`).

## Beta limitations

- Training is **manual** (notebook) — no automated retraining pipeline
- No model registry (MLflow planned for later)
- No version tracking of metrics in production
- Model committed in repo for simplicity — will move to external storage in production

## Planned (post-beta)

- `train.py` script runnable from CI
- MLflow or similar for experiment tracking
- Scheduled retraining when new DVF data is published
- Deploy new model only if metrics improve on a holdout set
