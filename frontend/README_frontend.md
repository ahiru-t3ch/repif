# Frontend — REPIF

**REPIF** (Real Estate Prices In France) — web UI for property price estimates. **Beta POC**, minimal single-page app.

## Role in the product

- User-facing entry point for the beta
- Collects property features and calls the backend API
- Displays the estimated price and geocoding match details

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| UI | React 19 + TypeScript |
| Styling | Tailwind CSS 4 |

## Project structure

```
frontend/
├── app/
│   ├── page.tsx       # Main page: form + result
│   ├── layout.tsx     # Root layout and metadata
│   └── globals.css    # Global styles
├── public/
├── package.json
└── README_frontend.md
```

## API integration

The browser calls **Next.js route handlers** (same origin). They proxy to FastAPI server-side:

| Browser | Next.js route | Backend |
|---|---|---|
| `GET /api/predictions` | → | `GET /predictions` |
| `POST /api/predict/apartment` | → | `POST /predict/apartment` |
| `POST /api/predict/house` | → | `POST /predict/house` |

Implementation: `app/api/**/route.ts` and `lib/backend.ts`.

Request body: `property_type`, `address`, `sbati`, `nblocdep`, `dpe_median`, `annee_construction`. The backend geocodes the address via Géoplateforme before running the model.

## Configuration

Server-only env vars live in **gitignored** `.env.local`:

```bash
cd frontend
cp .env.example .env.local
```

| Variable | Purpose |
|---|---|
| `BACKEND_URL` | FastAPI base URL (used by route handlers only) |
| `BACKEND_JWT_PRIVATE_KEY` | PEM private key — signs short-lived JWTs sent to the backend |
| `BACKEND_JWT_TTL_SECONDS` | Token lifetime in seconds (default `300`) |
| `RATE_LIMIT_PREDICT_PER_MIN` | Max POST `/api/predict/*` per IP per minute (default `10`) |
| `RATE_LIMIT_PREDICTIONS_PER_MIN` | Max GET `/api/predictions` per IP per minute (default `60`) |

These variables are **not** exposed to the browser. Generate keys with `bash generate-jwt-keys.sh` from the repo root; set the public key on the backend (`BACKEND_JWT_PUBLIC_KEY`). Swagger (`/docs`) is controlled by **`ENABLE_DOCS`** on the backend — see [backend/README_backend.md](../backend/README_backend.md#configuration).

Rate limits apply in **Next.js middleware** (first layer) and **FastAPI** (second layer). The proxy forwards the client IP via `X-Forwarded-For`.

**Docker Compose:** `BACKEND_URL=http://backend:8000` is set in `docker-compose.yml` for the frontend service.

**Standalone container:**

```bash
docker run -d --name repif-web -p 3000:3000 \
  -e BACKEND_URL=http://host.docker.internal:8000 \
  repif-frontend
```

## Prerequisites

- Node.js 18+ (project tested with Node 24)
- Backend API running on port 8000 (reachable from the Next.js server via `BACKEND_URL`)

## Run locally

```bash
cd frontend
npm install
npm run dev
```

App: http://localhost:3000

## Build for production

```bash
npm run build
npm start
```

## Run with Docker

Use [Docker Compose from the repo root](../README.md#run-with-docker-compose) to run the full stack.

Standalone image (set backend URL at **runtime**):

```bash
cd frontend
docker build -t repif-frontend .
docker run -d --name repif-web -p 3000:3000 \
  -e BACKEND_URL=http://host.docker.internal:8000 \
  repif-frontend
```

## Coolify production

Deploy as a **separate Dockerfile application** in the same Coolify project/environment as the backend and Postgres.

### Application settings

| Setting | Value |
|---|---|
| Build Pack | Dockerfile |
| Base Directory | `/frontend` |
| Dockerfile Location | `/Dockerfile` |
| Port | **3000** |
| Persistent Storage | none |

Use **Production Environment Variables** only (Preview is for PR deployments — leave empty unless you use preview deploys).

### Environment variables (Production)

```env
BACKEND_URL=https://api.hawk-prix-immo.example.com
BACKEND_JWT_PRIVATE_KEY=<PEM private key — pair with backend public key>
BACKEND_JWT_ISSUER=repif-frontend
BACKEND_JWT_AUDIENCE=repif-backend
BACKEND_JWT_TTL_SECONDS=300
```

Generate the key pair from the repo root: `bash generate-jwt-keys.sh`. Set the **public** key on the backend (`BACKEND_JWT_PUBLIC_KEY`).

**JWT key format in Coolify:** multiline PEM (real line breaks) or single line with `\n` — both work. The app normalizes `\n` at runtime. Do not use `BEGIN RSA PRIVATE KEY` (must be PKCS#8: `BEGIN PRIVATE KEY`). To verify without printing the full key:

```bash
docker exec FRONTEND_CONTAINER sh -c '[ -n "$BACKEND_JWT_PRIVATE_KEY" ] && echo OK'
docker exec FRONTEND_CONTAINER sh -c 'case "$BACKEND_JWT_PRIVATE_KEY" in *"BEGIN PRIVATE KEY"*) echo PEM OK;; esac'
```

### `BACKEND_URL` — internal vs public

The browser never calls the backend directly; Next.js route handlers fetch server-side using `BACKEND_URL`.

| Approach | Example | When |
|---|---|---|
| Internal (ideal) | `http://<backend-coolify-uuid>:8000` | Both apps resolve each other on the same Docker network |
| Public HTTPS (beta fallback) | `https://api.hawk-prix-immo.example.com` | Separate Dockerfile apps often get **isolated networks** — internal hostname returns `EAI_AGAIN` / `fetch failed` |

**Recommended for two Dockerfile apps on Coolify:** use the backend’s **public HTTPS domain** in `BACKEND_URL`. Traffic stays server-to-server (BFF + JWT); the URL is not exposed in the browser bundle.

Test connectivity from the frontend container:

```bash
docker exec FRONTEND_CONTAINER wget -qO- "$BACKEND_URL/"
# expect: {"status":"ok"}
```

> **Note:** “Connect to Predefined Network” in Coolify applies mainly to **Docker Compose** stacks, not standalone Dockerfile apps. Internal URLs may work after shared **Destinations** / network setup; until then, use the public API URL.

### Custom domain and HTTPS

1. **DNS** (e.g. Infomaniak zone for `example.com`) — type **A** to the VPS IP (no Infomaniak web redirect / proxy on these hostnames):

   | Host | Type | Target |
   |---|---|---|
   | `hawk-prix-immo` | A | VPS IP |
   | `www.hawk-prix-immo` | A | VPS IP |
   | `api.hawk-prix-immo` | A | VPS IP |

2. **Coolify → Domains** (frontend):

   ```
   https://hawk-prix-immo.example.com
   https://www.hawk-prix-immo.example.com
   ```

3. **Advanced → Force HTTPS** → Save → **Redeploy**. If HTTP is not redirected, use **Reset Coolify Generated Labels** and redeploy again.

4. Verify redirect:

   ```bash
   curl -I http://hawk-prix-immo.example.com
   # expect: 301/302 Location: https://...
   ```

Let’s Encrypt is issued automatically by Traefik when DNS points to the VPS and ports **80/443** are open. Typing the hostname without `https://` may open HTTP first — Force HTTPS fixes that (including in private browsing, where HSTS cache is empty).

5. Update `BACKEND_URL` to the backend HTTPS domain and redeploy the frontend.

### Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `fetch failed` / `EAI_AGAIN` | Internal `BACKEND_URL` not reachable | Use public `https://api…` URL |
| `no available server` | Domain not linked to app or wrong port | Domains in Coolify, port **3000**, **Redeploy** |
| `500` + `BACKEND_URL is not configured` | Env in Preview instead of Production | Set **Production** vars |
| `401` on `/api/predict/*` | JWT key mismatch | Same key pair; matching `ISSUER` / `AUDIENCE` |
| “Non sécurisé” but cert valid | Page loaded over **HTTP** | Force HTTPS; open `https://…` explicitly |

See also [backend/README_backend.md](../backend/README_backend.md#coolify-production) and [models_back/README.md](../backend/models_back/README.md).

## Beta limitations

- Single column layout (no side ad rails in beta)
- User enters a postal address (geocoded server-side by the backend)
- No mobile-specific polish
- First estimate free; rewarded ads before further estimates planned (post-beta)

## Planned (post-beta)

- Address autocomplete (Géoplateforme)
- Loading skeletons and clearer error states
