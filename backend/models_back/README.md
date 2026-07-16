# Serialized XGBoost models (`.joblib` not in Git)

Place `.joblib` files and the training **metrics JSON** here locally or on the server (Coolify persistent volume, Compose bind mount).

The API loads them at startup using filenames from env:

- `MODEL_APARTMENT` — e.g. `apartment_dev_20260621_220900.joblib`
- `MODEL_HOUSE` — e.g. `house_dev_20260621_220900.joblib`
- `MODEL_METRICS` — e.g. `metrics_dev_20260716_120000.json` (provides `mape_pct` for indicative price ranges)

A placeholder `metrics_dev.json` is committed for local bootstrapping. **Replace it** with the `metrics_*.json` from the same training run as your `.joblib` models (use the **dev** metrics JSON even when deploying `_prod` models — that file holds the hold-out MAPE).

## Local development

1. Train and save in `ml/` → `ml/models/`.
2. Copy the `.joblib` files **and** the matching `metrics_*.json` into this folder (`backend/models_back/`).
3. Set `MODEL_APARTMENT` / `MODEL_HOUSE` / `MODEL_METRICS` in `backend/.env` (or root `.env` for Compose) if filenames differ from defaults.
4. Start the API (Compose bind-mounts this folder — see root `docker-compose.yml`).

## Docker Compose (local / staging)

`./backend/models_back` is bind-mounted into the backend container at `/backend/models_back`. Copy files on the host, then restart the backend service.

## Coolify — deliver `.joblib` to persistent storage

Models are **not** in Git. On Coolify they live on a **Persistent Storage** volume mounted at `/backend/models_back`.

Because the API loads models **at startup**, the backend container may stay **Exited** until the files are present. Use **SSH + SCP** on the VPS (Coolify terminal is unavailable while the container is down).

### Prerequisites

- Trained models on your machine (typically copied from `ml/models/`).
- SSH access to the Coolify VPS (note your SSH **port** if not 22).
- Coolify backend app configured with:
  - **Persistent Storage** → **Volume Mount** → destination `/backend/models_back`
  - **Production** env vars (not Preview):

    ```env
    MODEL_APARTMENT=apartment_dev_20260621_220900.joblib
    MODEL_HOUSE=house_dev_20260621_220900.joblib
    MODEL_METRICS=metrics_dev_20260716_120000.json
    ```

- At least one deploy after adding the volume mount (creates the Docker volume even if the app crashes).

### Step 1 — Upload files to the VPS

From your machine, in the folder that contains the `.joblib` files:

```bash
# Default SSH port (22)
scp apartment_dev_20260621_220900.joblib user@VPS_IP:/tmp/
scp house_dev_20260621_220900.joblib user@VPS_IP:/tmp/
scp metrics_dev_20260716_120000.json user@VPS_IP:/tmp/

# Custom SSH port (scp uses -P uppercase)
scp -P PORT apartment_dev_20260621_220900.joblib user@VPS_IP:/tmp/
scp -P PORT house_dev_20260621_220900.joblib user@VPS_IP:/tmp/
scp -P PORT metrics_dev_20260716_120000.json user@VPS_IP:/tmp/
```

Use an **absolute** destination path `/tmp/` (not `tmp` or `~/tmp`).

On the VPS, confirm:

```bash
ls -lh /tmp/*.joblib
```

Expected sizes are roughly ~150 MB (apartment) and ~400 MB (house), depending on the training run.

> `/tmp` may be cleared on reboot. If files are missing after a reboot, repeat this step before copying into the volume.

### Step 2 — Find the Coolify volume

SSH into the VPS:

```bash
docker volume ls
```

Identify the volume attached to the backend app (name often contains a Coolify resource id, e.g. `w3ab081…`).

Optional — inspect mount point:

```bash
docker volume inspect VOLUME_NAME
```

### Step 3 — Copy files into the volume

Replace `VOLUME_NAME` with the name from step 2:

```bash
docker run --rm \
  -v VOLUME_NAME:/dest \
  -v /tmp:/tmp \
  alpine sh -c "cp /tmp/*.joblib /tmp/metrics_*.json /dest/ && ls -lh /dest/"
```

Alternative via mount point:

```bash
sudo cp /tmp/*.joblib /tmp/metrics_*.json /var/lib/docker/volumes/VOLUME_NAME/_data/
sudo ls -lh /var/lib/docker/volumes/VOLUME_NAME/_data/
```

You should see the `.joblib` files, the metrics JSON, plus optionally `README.md` from the image build.

### Step 4 — Redeploy and verify

1. In Coolify → backend app → **Redeploy**.
2. Status should become **Running** (no `FileNotFoundError` in logs).

On the VPS:

```bash
docker ps
docker exec -it BACKEND_CONTAINER_NAME ls -lh /backend/models_back/
```

Replace `BACKEND_CONTAINER_NAME` with the running backend container (Coolify generates names like `w3ab081…-1234567890`; filter with `docker ps` and the `uvicorn app.main:app` command).

Quick API check (replace with your Coolify domain):

```bash
curl https://your-backend-domain/
```

### Updating models later

1. Train new models in `ml/`.
2. Update `MODEL_APARTMENT` / `MODEL_HOUSE` / `MODEL_METRICS` in Coolify **Production** env if filenames change.
3. Repeat steps 1–4 (SCP → volume → redeploy), including the matching `metrics_*.json`.
4. Old `.joblib` / metrics files can be removed from the volume to save disk space.

## Switch models without redeploying the image

Update files in this folder (or on the Coolify volume) and/or change `MODEL_*` env vars, then **restart** or **redeploy** the backend.

## See also

Full Coolify stack (Postgres, domains, HTTPS, frontend `BACKEND_URL`, JWT):

- [../../README.md#deploy-on-coolify-beta-vps](../../README.md#deploy-on-coolify-beta-vps)
- [../README_backend.md#coolify-production](../README_backend.md#coolify-production)
- [../../frontend/README_frontend.md#coolify-production](../../frontend/README_frontend.md#coolify-production)
