# ML — REPIF model

* REPIF (Real Estate Prices In France)
* Machine learning pipeline for apartments and houses price estimation
* Trained on DVF+ and DPE (ADEME) data
* Trained on local compputer for the moment

## Setup

```bash
cd ml
python -m venv .venv
source .venv/Scripts/activate   # Windows Git Bash
pip install -r requirements.txt
pip install -e .
```

## Data Sources

* NB: no data provided for: Alsace, Moselle and Mayotte
* Open data does not exist for those on the French Govenement Websites
* Format CSV and download manually
    * Loading SQL dumps is overkill for the moment because to costly in term of Disk space
    * CSV files are gitignored

### DVF+ "mutation" (transfer) in local DB

* Data source: [dvfplus-open-data](https://datafoncier.cerema.fr/donnees/autres-donnees-foncieres/dvfplus-open-data)
    * Go to "Espace de téléchargement > avril_2026 > csv"
    * Extract data (arround 8,3 Go)
    * Get csv files within \National\DVF_PLUS_2026_1_CSV_R999_ED251_part\DVF_PLUS_2026_1_CSV_R999_ED251\1_DONNEES_LIVRAISON
    * Drop them into `ml/csv_data/dvf_plus`
* Data description:
    * Dictionary: [dv3f dictionnary](https://doc-datafoncier.cerema.fr/doc/dv3f/?v=8)
    * Similar to dvf+
    * 1 row = 1 sale

### DPE data from ADEME

* Data source: https://data.ademe.fr/datasets/dpe03existant
    * Click on download action button and download csv file
    * Drop the csv file into `ml/csv_data/dpe`

## Code structure

```
ml/
├── csv_data/              # Raw CSV inputs (gitignored)
│   ├── dvf_plus/          # DVF+ mutation files (pipe-separated)
│   └── dpe/               # ADEME DPE national CSV
├── models/                # Saved models (gitignored, created on save)
├── notebooks/             # Exploration and training notebooks
├── repif_ml/              # Python package (install with pip install -e .)
├── requirements.txt
└── pyproject.toml
```

Typical workflow:

1. Download DVF+ and DPE CSVs into `csv_data/`
2. Load and merge data with `get_data_for_training()`
3. Train a dev model with `train_model_dev()`, evaluate on the hold-out split
4. Refit on all rows with `train_final_model()` for production
5. Save with `save_model(..., stage="dev"|"prod")` into `ml/models/`

Enable progress logs in a notebook:

```python
from repif_ml import configure_logging

log_path = configure_logging()  # also writes ml/models/repif_ml_YYYYMMDD_HHMMSS.log
print(log_path)
```

## Package repif_ml

Installable Python package (`pip install -e .` from `ml/`). One module per data source or pipeline step.

| Module | Role |
|---|---|
| `dvf_plus.py` | Load and filter DVF+ mutation CSVs; split houses / apartments; add WGS84 coordinates |
| `dpe.py` | Load and clean ADEME DPE CSV; aggregate rows by building (`lat`/`lon`) |
| `geo.py` | Convert projected parcel coordinates to `lat`/`lon` (Lambert-93 / DOM EPSG by department) |
| `train_models.py` | Merge DVF + DPE, train XGBoost models, evaluate, save / load |
| `log.py` | `configure_logging()` for notebook and script output |

### Main functions

**Data loading**

- `process_dvf_plus_csv(csv_dir_path)` → `(df_house, df_apartment)`
- `process_dpe_csv(csv_path)` → cleaned DPE rows
- `aggregate_dpe_buildings(df)` → one row per building with `dpe_median`, `annee_construction`
- `merge_dvf_dpe(dvf_df, dpe_bat)` → nearest DPE building within 30 m (BallTree / haversine)
- `get_data_for_training(dvf_dir, dpe_path)` → house and apartment DataFrames ready to train

**Training**

- `train_model_dev(df, ...)` → hyperparameter search on 80 % oldest sales (`RandomizedSearchCV` + `TimeSeriesSplit`); target = `log(valeurfonc)`
- `evaluate_model_dev(model_dev, df)` → R², MAE, MAPE on 20 % most recent sales
- `train_final_model(model_dev, df)` → refit with the same best params on 100 % of rows (production model)

**Persistence**

- `save_model(model, name="apartment", stage="dev"|"prod")` → `ml/models/{name}_{stage}_{timestamp}.joblib`
- `load_model(path)` → fitted `XGBRegressor`

Default features: `sbati`, `nblocdep`, `lat`, `lon`, `l_codinsee`, `dpe_median`, `annee_construction` (see `DEFAULT_FEATURES` in `train_models.py`). Predictions are in log-price; convert back to euros with `np.exp()`.

## Limitations and caveats

This pipeline produces **price estimates**, not official appraisals. Results should be treated as an **indicative index**, useful for exploration, benchmarking, or product prototyping and create a dialogue / challenge with professionals: such as a notaire, estate agent, or professional valuation.

### Target price (`valeurfonc`)

The model learns to predict `valeurfonc`, the value declared in DVF+ for the sale.

**We have no reliable way to know whether this price includes agency fees (frais d'agence) or not.** In practice, some transactions are recorded net seller, others gross buyer; DVF+ does not expose a clear, consistent flag for this in our current CSV pipeline. The model therefore mixes both regimes without being able to disentangle them. Predictions may be systematically biased depending on local market practice.

Other unmodelled factors also affect the true transaction price: negotiation, inclusion of furniture, leasehold vs freehold, co-ownership charges, VAT on new build, etc.

### DPE features (`dpe_median`, `annee_construction`)

DPE data is joined to DVF sales **spatially** (nearest building within 30 m), not by a stable property ID. This introduces several limitations:

- A sale parcel and the matched DPE point may not refer to the **same dwelling** (neighbouring building, wrong entrance, condominium with several DPE records).
- When several DPE exist at the same coordinates, we keep a **median energy score** and the **first** construction year — a rough summary, not a precise description of the sold unit.
- `dpe_median` is a **discrete index** (classes A→1 … G→7), not continuous consumption (kWh/m²) or renovation cost.
- `annee_construction` from DPE can differ from the actual year of the unit sold, and is missing or wrong for a non-trivial share of matches.

These features add signal on average, but they are **imprecise proxies**. They must not be read as “the DPE of this exact apartment/house sold”.

### Model output

- Metrics on the hold-out split (R², MAE, MAPE) describe **past** sales under our filters; they do not guarantee accuracy on a new listing.
- Separate models for houses and apartments reflect different market dynamics; a weaker house model is expected given higher heterogeneity.
- Geographic and temporal coverage is limited to the data we load (filters, missing departments, DPE match rate).

**In short:** use predictions as a **rough market index**, not as a certified price. Any user-facing product should state uncertainty, data sources, and these limitations explicitly.