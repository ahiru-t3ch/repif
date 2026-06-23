# Serialized XGBoost models (not in Git)

Place `.joblib` files here locally or on the server (Coolify persistent volume, Compose bind mount).

The API loads them at startup using filenames from env:

- `MODEL_APARTMENT` — e.g. `apartment_dev_20260621_220900.joblib`
- `MODEL_HOUSE` — e.g. `house_dev_20260621_220900.joblib`

**Local:** copy from `ml/models/` after training.

**Coolify:** mount persistent storage on `/backend/models_back` and upload the files via terminal.

**Compose:** `./backend/models_back` is bind-mounted into the backend container (see root `docker-compose.yml`).

To switch models: update files in this folder and/or change `MODEL_*` env vars, then restart the backend.
