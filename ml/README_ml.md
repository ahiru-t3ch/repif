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
6. **Deploy to API:** copy `.joblib` files to `backend/models_back/` and set `MODEL_APARTMENT` / `MODEL_HOUSE` in `.env`

### Beta training settings (fast iteration)

For the current beta, dev models trained on the **100k most recent sales** are sufficient.

One-shot from the command line (trains apartment + house, saves `.joblib` + a
`metrics_*.json`):

```bash
python -m repif_ml.train_local          # 100k rows, n_iter=10, n_cv_splits=3
```

Or call the underlying pipeline directly in a notebook:

```python
from repif_ml.train_models import run_training

run_training(
    dvf_dir="../csv_data/dvf_plus",
    dpe_csv="../csv_data/dpe/dpe-france.csv",
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

## Train on Google Cloud Platform (Compute Engine)

For a one-off run on hardware bigger than your laptop. The idea: upload the raw
CSVs **once** to a GCS bucket, spin up a VM on demand, train, push the `.joblib`
back to the bucket, then **delete the VM** so it costs nothing when idle.

Use `python -m repif_ml.train_gcp` (CWD-independent, configurable). It mirrors
`train_local` but ships *thorough* defaults (all rows, `--n-iter 50
--n-cv-splits 5`) suited to a bigger VM; every value is overridable.

### Prerequisites

- `gcloud` CLI installed and authenticated (`gcloud auth login`).
- A GCP project selected: `gcloud config set project YOUR_PROJECT_ID`.
- Local CSVs present in `ml/csv_data/` (`dvf_plus/*.csv` + `dpe/dpe-france.csv`).

All local commands below use **Git Bash** (Windows). On the Windows filesystem,
your repo lives at e.g. `/c/Users/you/repos/repif` in Git Bash.

### 1. Variables (run locally — Git Bash)

```bash
PROJECT="your-project-id"
REGION="europe-west1"            # Paris = europe-west9
ZONE="europe-west1-b"            # Paris = europe-west9-a
VM="repif-train"
BUCKET="gs://your-project-id-repif-data"   # must be globally unique
REPO="https://github.com/you/repif.git"    # your git remote
```

### 2. Upload the raw data to GCS (once)

```bash
gcloud storage buckets create "$BUCKET" --location="$REGION"
gcloud storage rsync --recursive ml/csv_data "$BUCKET/csv_data"
```

Run the `rsync` from the repo root so `ml/csv_data` resolves. It is resumable
and only re-sends changed files on later runs.

### 3. Create the VM

```bash
gcloud compute instances create "$VM" \
  --zone="$ZONE" \
  --machine-type=e2-standard-8 \
  --image-family=debian-12 \
  --image-project=debian-cloud \
  --boot-disk-size=100GB \
  --boot-disk-type=pd-balanced \
  --scopes=cloud-platform
```

- `e2-standard-8` = 8 vCPU / 32 GB, balanced and cheap (~$0.27/h). For a faster
  CPU, use `c2-standard-8` (compute-optimized). Bump to `e2-standard-16` (64 GB)
  for the heavy `--n-iter 50 --n-cv-splits 5` full-dataset run.
- `--scopes=cloud-platform` lets the VM read/write your bucket via its default
  service account.
- Optional, cheaper for short jobs: add `--provisioning-model=SPOT --instance-termination-action=STOP`.

### 4. Connect and set up the environment

```bash
gcloud compute ssh "$VM" --zone="$ZONE"
```

Then **on the VM** (Debian, bash):

```bash
BUCKET=gs://your-project-id-repif-data   # same bucket as step 1

sudo apt-get update
sudo apt-get install -y git python3-venv python3-pip libgomp1

git clone "$REPO" repif          # $REPO from step 1, or scp (see note below)
cd repif/ml

python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
pip install -e .

# Pull the data uploaded in step 2
gcloud storage rsync --recursive "$BUCKET/csv_data" csv_data
```

> Code only in Git? The CSVs and models are gitignored, so cloning is small —
> the data comes from GCS. No Git remote? Copy the folder instead (from the repo
> root, in local Git Bash): `gcloud compute scp --recurse ml "$VM":~/repif-ml --zone="$ZONE"`
> (exclude `csv_data/` and `models/`), then upload data via GCS as above.

### 5. Run the training

Long runs: keep them alive across SSH drops with `tmux` (activate the venv
*inside* tmux, it starts a fresh shell):

```bash
tmux new -s train
source .venv/bin/activate
# run a command below ; detach with Ctrl-b then d ; reattach: tmux attach -t train
```

**Stage A — dev model (train/hold-out split + evaluation).** `train_gcp`
defaults train on all rows with a wider search:

```bash
python -m repif_ml.train_gcp                    # all rows, n_iter=50, cv=5
```

Lighter/faster variants (override the defaults):

```bash
python -m repif_ml.train_gcp --n-iter 20 --n-cv-splits 4
python -m repif_ml.train_gcp --max-train-rows 300000 --n-iter 20 --n-cv-splits 4
```

Outputs: `apartment_dev_*.joblib`, `house_dev_*.joblib`, plus a `metrics_*.json`.

> **Memory:** keep `--search-jobs 1` (default) — one candidate at a time, XGBoost
> uses all cores, a single data copy in RAM. On the full dataset with a small VM
> (e.g. 32 GB) a higher value risks OOM (killed worker). Raise it only with lots
> of RAM.

**Stage B — production model (refit on 100 % of rows).** Once the stage-A
hold-out metrics look good, refit the saved dev models on all rows (uses their
tuned hyperparameters):

```bash
python -m repif_ml.train_final \
  --apartment-dev models/apartment_dev_XXXXXXXX_XXXXXX.joblib \
  --house-dev     models/house_dev_XXXXXXXX_XXXXXX.joblib
```

Outputs: `apartment_prod_*.joblib`, `house_prod_*.joblib`.

### 6. Push the models back and fetch them locally

On the VM:

```bash
gcloud storage cp models/*.joblib models/metrics_*.json "$BUCKET/models/"
```

Locally (Git Bash, from the repo root):

```bash
gcloud storage cp "$BUCKET/models/*" ml/models/
```

Then deploy as usual: copy the `.joblib` into `backend/models_back/` and set
`MODEL_APARTMENT` / `MODEL_HOUSE` (see repo root README, step 6 of the workflow).

### 7. Delete the VM (stop billing)

```bash
gcloud compute instances delete "$VM" --zone="$ZONE"
```

The bucket keeps your data and models for the next run at negligible cost. To
just pause instead of deleting: `gcloud compute instances stop "$VM" --zone="$ZONE"`
(you still pay for the boot disk).

## Package `repif_ml`

Install with `pip install -e .` from `ml/`.

| Module | Role |
|---|---|
| `dvf_plus.py` | Load/filter DVF+ CSVs; split houses / apartments; WGS84 coordinates |
| `dpe.py` | Load/clean DPE CSV; aggregate by building |
| `geo.py` | Lambert-93 / DOM → `lat` / `lon` |
| `train_models.py` | Library: merge DVF+DPE, train/evaluate/save XGBoost models, `run_training()` |
| `train_local.py` | CLI runner (stage A) — `python -m repif_ml.train_local` (fast beta defaults) |
| `train_gcp.py` | CLI runner (stage A) — `python -m repif_ml.train_gcp` (thorough defaults, bigger VM) |
| `train_final.py` | CLI runner (stage B) — `python -m repif_ml.train_final` (refit `_dev` → `_prod` on 100% of rows) |
| `log.py` | `configure_logging()` |

`train_local.py` and `train_gcp.py` are thin wrappers over `run_training()`;
they differ only in default hyperparameters and share `_train_cli.py`.
`train_final.py` wraps `finalize_training()`.

### Main functions

**Data loading**

- `process_dvf_plus_csv(csv_dir_path)` → `(df_house, df_apartment)`
- `process_dpe_csv(csv_path)` → cleaned DPE rows
- `aggregate_dpe_buildings(df)` → one row per building (`dpe_median`, `annee_construction`)
- `merge_dvf_dpe(dvf_df, dpe_bat)` → nearest DPE building within 30 m (BallTree)
- `get_data_for_training(dvf_dir, dpe_path)` → ready-to-train DataFrames

**Training**

- `run_training(dvf_dir, dpe_csv, ...)` → stage A pipeline: load, train + eval + save each dev model, write `metrics_*.json` (used by the `train_local` / `train_gcp` CLIs)
- `train_model_dev(df, ..., search_n_jobs=1)` → `RandomizedSearchCV` + `TimeSeriesSplit`; target = `log(valeurfonc)` (see the parallelism note below)
- `evaluate_model_dev(model_dev, df)` → R², MAE, MAPE on hold-out
- `train_final_model(model_dev, df)` → refit on 100 % of rows (production)
- `finalize_training(dvf_dir, dpe_csv, dev_models={...})` → stage B: refit saved `_dev` models on 100 % of rows and save as `_prod` (used by the `train_final` CLI)

**Parallelism (avoid OOM):** `train_model_dev` parallelizes a single level.
Default `search_n_jobs=1` is memory-safe (one candidate at a time, XGBoost uses
all cores → a single data copy in RAM). Set `--search-jobs N` (CLI) only if you
have plenty of RAM; each parallel job holds its own data copy.

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
