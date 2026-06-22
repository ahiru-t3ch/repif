# Frontend — REPIF

**REPIF** (Real Estate Prices In France) — web UI for property price estimates. **Beta POC**, minimal single-page app.

## Role in the product

- User-facing entry point for the beta
- Collects property features and calls the backend API
- Displays the estimated price and recent predictions from the database

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
│   ├── page.tsx       # Main page: form + result + history
│   ├── layout.tsx     # Root layout and metadata
│   └── globals.css    # Global styles
├── public/
├── package.json
└── README_frontend.md
```

## API integration (current state)

The backend now exposes:

- `POST /predict/apartment`
- `POST /predict/house`

with a JSON body using DVF+/DPE field names (`sbati`, `l_codinsee`, `lat`, `lon`, `dpe_median`, etc.).

**The form in `page.tsx` still calls the legacy `POST /predict` endpoint** with `postal_code`, `room_count`, and `living_area`. It must be updated to match the new API before the full stack works end-to-end.

Until then, test predictions via the backend Swagger UI: http://localhost:8000/docs

## Configuration

```ts
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
```

Set `NEXT_PUBLIC_API_URL` in `.env.local` when deploying.

## Prerequisites

- Node.js 18+ (project tested with Node 24)
- Backend API running on port 8000
- CORS enabled on the backend for `http://localhost:3000`

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

## Beta limitations

- Single page — no routing, auth, or accounts
- Form not yet aligned with the new prediction API
- No mobile-specific polish
- No ad integration yet

## Planned (post-beta)

- Form for apartment / house with all required ML features (or backend-side geocoding)
- Property type selector (`APARTMENT` / `HOUSE`)
- Updated prediction history display
- Loading skeletons and clearer error states
