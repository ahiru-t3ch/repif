# ml_v2 — Investigation & training

Investigation notebooks plus reproducible training scripts for **apartments** and **houses**, without `commune_price_m2_median`.

## Structure

```
ml_v2/
├── repif_ml_v2/              # shared code (data, train, config)
├── apartments/
│   ├── investigation_apartment_model.ipynb
│   ├── train_dev.py          # dev: search + 80/20 hold-out
│   └── train_final.py        # prod: refit on 100% of rows
├── homes/
│   ├── investigation_house_model.ipynb
│   ├── train_dev.py
│   └── train_final.py
└── models/                   # outputs (.joblib + metrics JSON)
    ├── apartment/
    └── house/
```

Raw CSVs live in `ml/csv_data/` (DVF + DPE).

## Prerequisites

```bash
cd ml
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
pip install -e .
```

Run all commands below from the **repository root** (`repif/`).

## Apartments

### Dev (RandomizedSearchCV + hold-out evaluation)

```bash
python ml_v2/apartments/train_dev.py
```

Options:

```bash
python ml_v2/apartments/train_dev.py \
  --n-iter 20 \
  --n-cv-splits 3 \
  --max-train-rows 200000 \
  --train-ratio 0.8
```

### Prod (refit on 100% when dev metrics look good)

```bash
python ml_v2/apartments/train_final.py \
  --dev-model ml_v2/models/apartment/apartment_dev_YYYYMMDD_HHMMSS.joblib
```

## Houses

### Dev

```bash
python ml_v2/homes/train_dev.py
```

Options:

```bash
python ml_v2/homes/train_dev.py \
  --n-iter 20 \
  --n-cv-splits 3 \
  --max-train-rows 200000
```

### Prod

```bash
python ml_v2/homes/train_final.py \
  --dev-model ml_v2/models/house/house_dev_YYYYMMDD_HHMMSS.joblib
```

## Outputs

Each run writes to `ml_v2/models/{apartment|house}/`:

| File | Content |
|---|---|
| `{name}_{dev\|prod}_{timestamp}.joblib` | XGBoost model |
| `metrics_{dev\|prod}_{timestamp}.json` | R², MAE, MAPE, `best_params`, DPE match rate, etc. |
| `commune_price_m2_lookup.json` | INSEE code → €/m² median (inference lookup, one per property type) |

## Commune market feature (`commune_price_m2_median`)

Leakage-safe expanding median of `valeurfonc / sbati` per commune, using only **past** sales (`min_prior=5`). Computed separately for apartments and houses. Saved automatically on each `train_dev` / `train_final` run.

Build lookup only (no training):

```bash
python ml_v2/build_commune_lookup.py --property both
python ml_v2/build_commune_lookup.py --property apartment
```

## Investigation baselines (no commune €/m² median)

| Model | R² | MAE | MAPE |
|---|---|---|---|
| Apartments (+ DPE) | ~0.849 | ~42k | ~21.8% |
| Houses (+ DPE, log_sterr) | ~0.756 | ~60k | ~28% |

## Config (`repif_ml_v2/config.py`)

| | Apartments | Houses |
|---|---|---|
| DPE pool | collective + Logement | Maison + Logement (non-collective) |
| MAX_DIST_M | 30 | 75 |
| Land | `sterr` (0–5,000 m²) | `log_sterr` (> 0, ≤ 50,000 m²) |
| DPE monotone | `-1` (A=1 … G=7) | same |
| Market | `commune_price_m2_median` (+1 monotone) | same |

## GCP (quick reference)

```bash
# 1. Upload data (once, local)
gcloud storage rsync --recursive ml/csv_data gs://YOUR-BUCKET/csv_data

# 2. On the VM (after clone repo + ml venv)
gcloud storage rsync --recursive gs://YOUR-BUCKET/csv_data ml/csv_data

# 3. Train in tmux
tmux new -s train
source ml/.venv/bin/activate
python ml_v2/apartments/train_dev.py
python ml_v2/homes/train_dev.py

# 4. Download models
gcloud storage rsync --recursive ml_v2/models gs://YOUR-BUCKET/ml_v2/models
```

Recommended VM: `e2-standard-8` (32 GB) or `e2-standard-16` for a full hyperparameter search.

See `ml/README_ml.md` for the detailed GCE runbook.

## Notebooks

`investigation_*_model.ipynb` files are for exploration. `train_*.py` scripts mirror the same logic for reproducible training (GCP, CI, prod).
