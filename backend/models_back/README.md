# Serialized XGBoost models (`.joblib` not in Git)

Place `.joblib` files and the training **metrics JSON** here locally or on the server (Coolify persistent volume, Compose bind mount).

The API loads them at startup using filenames from env:

- `MODEL_APARTMENT` — e.g. `apartment_prod_20260723_144015.joblib`
- `MODEL_HOUSE` — e.g. `house_prod_20260723_162418.joblib`
- `MODEL_METRICS_APARTMENT` — e.g. `metrics_prod_20260723_144015_apartment.json` (hold-out `mape_pct` for price ranges)
- `MODEL_METRICS_HOUSE` — e.g. `metrics_prod_20260723_162418_house.json`
- `MODEL_COMMUNE_LOOKUP_APARTMENT` — e.g. `commune_price_m2_lookup_apartment.json`
- `MODEL_COMMUNE_LOOKUP_HOUSE` — e.g. `commune_price_m2_lookup_house.json`

A placeholder `metrics_dev.json` is committed for local bootstrapping (legacy combined format). **Replace** per-model metrics and lookup files from the same training run as your `.joblib` models.

## Local development

1. Train in `ml_v2/` → `ml_v2/models/{apartment|house}/`.
2. Copy the **six files** from the same prod run into this folder (`backend/models_back/`).
3. Set `MODEL_*` in `backend/.env` (or root `.env` for Compose) if filenames differ from defaults.
4. Start the API (Compose bind-mounts this folder — see root `docker-compose.yml`).

## Docker Compose (local / staging)

`./backend/models_back` is bind-mounted into the backend container at `/backend/models_back`. Copy files on the host, then restart the backend service.

## Coolify — deliver ml_v2 artifacts to persistent storage

Models and lookups are **not** in Git. On Coolify they live on a **Persistent Storage** volume mounted at `/backend/models_back`.

Because the API loads everything **at startup**, the backend container may stay **Exited** until all six files are present. Use **SSH + SCP** on the VPS (Coolify terminal is unavailable while the container is down).

### Files to deploy (one prod training run)

| File | Role |
|---|---|
| `apartment_prod_20260723_144015.joblib` | Apartment XGBoost model |
| `house_prod_20260723_162418.joblib` | House XGBoost model |
| `metrics_prod_20260723_144015_apartment.json` | Apartment hold-out metrics (About page + MAPE bounds) |
| `metrics_prod_20260723_162418_house.json` | House hold-out metrics |
| `commune_price_m2_lookup_apartment.json` | INSEE → €/m² median (apartments) |
| `commune_price_m2_lookup_house.json` | INSEE → €/m² median (houses) |

Download from GCS (if stored there):

```bash
gcloud storage cp gs://compute-models-repif-data/apartment_prod_20260723_144015.joblib .
gcloud storage cp gs://compute-models-repif-data/house_prod_20260723_162418.joblib .
gcloud storage cp gs://compute-models-repif-data/metrics_prod_20260723_144015_apartment.json .
gcloud storage cp gs://compute-models-repif-data/metrics_prod_20260723_162418_house.json .
gcloud storage cp gs://compute-models-repif-data/commune_price_m2_lookup_apartment.json .
gcloud storage cp gs://compute-models-repif-data/commune_price_m2_lookup_house.json .
```

Or copy from local training output (`ml_v2/models/…`).

### Coolify checklist (backend app)

1. **Persistent Storage** → Volume Mount → `/backend/models_back`
2. **Production** env vars (update filenames when you ship a new run):

   ```env
   MODEL_APARTMENT=apartment_prod_20260723_144015.joblib
   MODEL_HOUSE=house_prod_20260723_162418.joblib
   MODEL_METRICS_APARTMENT=metrics_prod_20260723_144015_apartment.json
   MODEL_METRICS_HOUSE=metrics_prod_20260723_162418_house.json
   MODEL_COMMUNE_LOOKUP_APARTMENT=commune_price_m2_lookup_apartment.json
   MODEL_COMMUNE_LOOKUP_HOUSE=commune_price_m2_lookup_house.json
   ENABLE_DOCS=false
   BACKEND_JWT_PUBLIC_KEY=<PEM public key>
   BACKEND_JWT_ISSUER=repif-frontend
   BACKEND_JWT_AUDIENCE=repif-backend
   DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DBNAME
   ```

3. Deploy once (creates the Docker volume even if the app crashes waiting for files).

### Coolify checklist (frontend app)

```env
BACKEND_URL=https://api.your-domain.example.com
BACKEND_JWT_PRIVATE_KEY=<PEM private key — pair with backend public key>
BACKEND_JWT_ISSUER=repif-frontend
BACKEND_JWT_AUDIENCE=repif-backend
BACKEND_JWT_TTL_SECONDS=300
```

Redeploy the frontend after any JWT or `BACKEND_URL` change.

### Step 1 — Upload files to the VPS

From your machine, in the folder that contains the six artifacts:

```bash
# Default SSH port (22) — repeat for each file, or use a glob if your shell supports it
scp apartment_prod_20260723_144015.joblib user@VPS_IP:/tmp/
scp house_prod_20260723_162418.joblib user@VPS_IP:/tmp/
scp metrics_prod_20260723_144015_apartment.json user@VPS_IP:/tmp/
scp metrics_prod_20260723_162418_house.json user@VPS_IP:/tmp/
scp commune_price_m2_lookup_apartment.json user@VPS_IP:/tmp/
scp commune_price_m2_lookup_house.json user@VPS_IP:/tmp/

# Custom SSH port (scp uses -P uppercase)
scp -P PORT *.joblib *.json user@VPS_IP:/tmp/
```

Use an **absolute** destination path `/tmp/` (not `tmp` or `~/tmp`).

On the VPS, confirm:

```bash
ls -lh /tmp/apartment_prod_*.joblib /tmp/house_prod_*.joblib /tmp/metrics_prod_*.json /tmp/commune_price_m2_lookup_*.json
```

Expected sizes: apartment `.joblib` ~150 MB, house `.joblib` ~400 MB, JSON files a few MB each.

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
  alpine sh -c "cp /tmp/apartment_prod_*.joblib /tmp/house_prod_*.joblib /tmp/metrics_prod_*.json /tmp/commune_price_m2_lookup_*.json /dest/ && ls -lh /dest/"
```

Alternative via mount point:

```bash
sudo cp /tmp/apartment_prod_*.joblib /tmp/house_prod_*.joblib /tmp/metrics_prod_*.json /tmp/commune_price_m2_lookup_*.json /var/lib/docker/volumes/VOLUME_NAME/_data/
sudo ls -lh /var/lib/docker/volumes/VOLUME_NAME/_data/
```

You should see **six** artifact files (plus optionally `README.md` from the image build).

### Step 4 — Redeploy and verify

1. In Coolify → backend app → **Redeploy**.
2. Status should become **Running** (no `FileNotFoundError` in logs).

On the VPS:

```bash
docker ps
docker exec -it BACKEND_CONTAINER_NAME ls -lh /backend/models_back/
```

Replace `BACKEND_CONTAINER_NAME` with the running backend container (Coolify generates names like `w3ab081…-1234567890`; filter with `docker ps` and the `uvicorn app.main:app` command).

Quick API checks (replace with your Coolify domain):

```bash
# Health — public, no JWT
curl https://your-backend-domain/

# Metrics — requires JWT (use frontend /about or generate-test-jwt.py)
curl -H "Authorization: Bearer $TOKEN" https://your-backend-domain/metrics
```

In the browser: open `/about` — apartment and house R² / MAE / MAPE should appear. Run a test estimate (appart + maison with rooms and, for houses, land area).

### Updating models later

1. Train new prod models in `ml_v2/` (`train_final.py`).
2. Update all six `MODEL_*` env vars in Coolify **Production** if filenames change.
3. Repeat steps 1–4 (SCP → volume → redeploy).
4. Remove old artifacts from the volume to save disk space.

### Prune stale files on the VPS

Over time the volume accumulates old `*_dev_*` / `*_prod_*` runs and legacy JSON (`metrics_dev.json`, `commune_price_m2_lookup.json`). The API only needs **six files** — those referenced by `MODEL_*` in Coolify.

**1. List what is on the volume**

```bash
docker ps   # find BACKEND_CONTAINER
docker exec BACKEND_CONTAINER ls -lh /backend/models_back/
```

**2. Confirm Coolify env vars** match the files you want to keep (prod ml_v2 set above).

**3. Dry-run cleanup** (shows KEEP / DROP, deletes nothing):

```bash
docker cp backend/models_back/prune-artifacts.sh BACKEND_CONTAINER:/tmp/prune-artifacts.sh
docker exec BACKEND_CONTAINER sh /tmp/prune-artifacts.sh /backend/models_back
```

Or via volume mount point on the host:

```bash
sudo sh /path/to/prune-artifacts.sh /var/lib/docker/volumes/VOLUME_NAME/_data
```

**4. Apply** (irreversible — optional backup first):

```bash
docker exec BACKEND_CONTAINER sh /tmp/prune-artifacts.sh /backend/models_back --apply
```

Typical files **removed** after migration to ml_v2:

- `apartment_dev_*.joblib`, `house_dev_*.joblib`
- `apartment_prod_*.joblib`, `house_prod_*.joblib` (older timestamps than current env)
- `metrics_dev*.json`, `metrics_dev_*.json` (legacy combined format)
- `commune_price_m2_lookup.json` (legacy single lookup)

After cleanup: **Redeploy** backend (or restart container) and verify `/about` + a test estimate.

## Switch models without redeploying the image

Update files in this folder (or on the Coolify volume) and/or change `MODEL_*` env vars, then **restart** or **redeploy** the backend.

## See also

Full Coolify stack (Postgres, domains, HTTPS, frontend `BACKEND_URL`, JWT):

- [../../README.md#deploy-on-coolify-beta-vps](../../README.md#deploy-on-coolify-beta-vps)
- [../README_backend.md#coolify-production](../README_backend.md#coolify-production)
- [../../frontend/README_frontend.md#coolify-production](../../frontend/README_frontend.md#coolify-production)
