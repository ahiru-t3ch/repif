# ML — REPIF model

**REPIF** (Real Estate Prices In France) — machine learning pipeline for apartment and house price estimation.

Trained on **DVF+** (Cerema) and **DPE** (ADEME) open data. Training runs locally for now; production retraining is planned on GCE.

## Setup

```bash
cd ml
python -m venv .venv
source .venv/Scripts/activate   # Windows Git Bash
pip install -r requirements.txt
pip install -e .
```

## Data sources

Departments **without open DVF data**: Alsace, Moselle, Mayotte.

Data is downloaded manually as CSV (SQL dumps are skipped for now — too heavy on disk). CSV files are gitignored.

### DVF+ mutations

- Source: [DVF+ open data](https://datafoncier.cerema.fr/donnees/autres-donnees-foncieres/dvfplus-open-data)
- Download: *Espace de téléchargement → avril_2026 → csv* (~8.3 GB archive)
- Extract department CSVs from  
  `National/.../1_DONNEES_LIVRAISON`
- Place files in `ml/csv_data/dvf_plus/`
- Dictionary: [DV3F / DVF+ documentation](https://doc-datafoncier.cerema.fr/doc/dv3f/?v=8)  
  One row = one sale (`idmutation`).

### DPE (ADEME)

- Source: [DPE logements existants](https://data.ademe.fr/datasets/dpe03existant)
- Download the national CSV
- Place in `ml/csv_data/dpe/`

## Code structure

```
ml/
├── csv_data/              # Raw CSV inputs (gitignored)
│   ├── dvf_plus/          # DVF+ mutation files (pipe-separated)
│   └── dpe/               # ADEME DPE national CSV
├── models/                # Saved models (gitignored)
├── notebooks/             # Training and prediction tests
├── repif_ml/              # Installable package (pip install -e .)
├── requirements.txt
└── pyproject.toml
```

## Typical workflow

1. Download DVF+ and DPE CSVs into `csv_data/`
2. Load and merge: `get_data_for_training(dvf_dir, dpe_path)`
3. Train dev models: `train_model_dev(...)` on apartment and house DataFrames
4. Evaluate: `evaluate_model_dev(...)` on the chronological hold-out
5. Save: `save_model(..., stage="dev")` → `ml/models/{name}_dev_{timestamp}.joblib`
6. **Deploy to API:** copy `.joblib` files to `backend/models_back/` and update paths in `backend/app/predictor.py`

### Beta training settings (fast iteration)

For the current beta, dev models trained on the **100k most recent sales** are sufficient:

```python
train_model_dev(
    df_apartment,
    max_train_rows=100_000,
    n_iter=10,
    n_cv_splits=3,
)
```

Reference metrics (hold-out, dev run):

| Model | R² | MAE | MAPE |
|---|---|---|---|
| Apartment | ~0.82 | ~46 k€ | ~24 % |
| House | ~0.66 | ~71 k€ | ~32 % |

Skip `train_final_model()` until you need a production model on 100 % of rows.

### Logging

```python
from repif_ml import configure_logging

log_path = configure_logging()  # also writes ml/models/repif_ml_YYYYMMDD_HHMMSS.log
print(log_path)
```

## Package `repif_ml`

Install with `pip install -e .` from `ml/`.

| Module | Role |
|---|---|
| `dvf_plus.py` | Load/filter DVF+ CSVs; split houses / apartments; WGS84 coordinates |
| `dpe.py` | Load/clean DPE CSV; aggregate by building |
| `geo.py` | Lambert-93 / DOM → `lat` / `lon` |
| `train_models.py` | Merge DVF+DPE, train/evaluate/save XGBoost models |
| `log.py` | `configure_logging()` |

### Main functions

**Data loading**

- `process_dvf_plus_csv(csv_dir_path)` → `(df_house, df_apartment)`
- `process_dpe_csv(csv_path)` → cleaned DPE rows
- `aggregate_dpe_buildings(df)` → one row per building (`dpe_median`, `annee_construction`)
- `merge_dvf_dpe(dvf_df, dpe_bat)` → nearest DPE building within 30 m (BallTree)
- `get_data_for_training(dvf_dir, dpe_path)` → ready-to-train DataFrames

**Training**

- `train_model_dev(df, ...)` → `RandomizedSearchCV` + `TimeSeriesSplit`; target = `log(valeurfonc)`
- `evaluate_model_dev(model_dev, df)` → R², MAE, MAPE on hold-out
- `train_final_model(model_dev, df)` → refit on 100 % of rows (production)

**Persistence**

- `save_model(model, name="apartment", stage="dev"|"prod")` → `ml/models/{name}_{stage}_{timestamp}.joblib`
- `load_model(path)` → fitted `XGBRegressor`

**Features** (see `DEFAULT_FEATURES` in `train_models.py`):

`sbati`, `nblocdep`, `lat`, `lon`, `l_codinsee`, `dpe_median`, `annee_construction`

Government field names are kept as-is. Convert predictions back to euros with `np.exp()`.

## Limitations and caveats

This pipeline produces **price estimates**, not official appraisals. Treat results as an **indicative market index** for exploration, benchmarking, or product prototyping — not as a certified valuation.

### Target price (`valeurfonc`)

The model predicts `valeurfonc` from DVF+. **Agency fees (frais d'agence) are not consistently flagged** in our CSV pipeline — some sales are net seller, others gross buyer. The model mixes both regimes.

Other unmodelled factors: negotiation, furniture, leasehold, co-ownership charges, VAT on new build, etc.

### DPE features

DPE is joined **spatially** (nearest building within 30 m), not by property ID:

- The matched DPE point may not be the sold dwelling
- Multiple DPE at one location → median energy score, first construction year
- `dpe_median` is a discrete class 1–7, not kWh/m²
- `annee_construction` can be missing or wrong for many matches

### Model output

- Hold-out metrics describe **past** filtered sales — not guaranteed accuracy on new listings
- House model is weaker (higher heterogeneity)
- Coverage depends on DVF+ filters and DPE match rate (~62 % apartments, ~29 % houses in a typical run)

**In short:** predictions are a rough market index. Any user-facing product should state uncertainty, data sources, and these limitations explicitly.
