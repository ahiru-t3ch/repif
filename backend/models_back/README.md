# Serialized XGBoost models (committed via Git LFS)

Place `.joblib` files here. The API loads them at startup using filenames from env:

- `MODEL_APARTMENT` — e.g. `apartment_dev_20260621_220900.joblib`
- `MODEL_HOUSE` — e.g. `house_dev_20260621_220900.joblib`

To deploy a new version: copy files from `ml/models/`, set the env vars, restart the backend.

Current beta models (~580 MB total) are tracked with **Git LFS** (GitHub rejects files over 100 MB otherwise).
