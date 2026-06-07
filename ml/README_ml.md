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
