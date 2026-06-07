# Frontend — REPIF

**REPIF** (Real Estate Prices In France) — web UI for estimating apartment prices. **Beta POC** — Haute-Garonne first, minimal UI, no ads yet (monetization planned).

## Role in the product

- User-facing entry point for the beta
- Collects apartment features (postal code, rooms, living area)
- Calls the backend API and displays the estimated price
- Shows recent predictions from the database

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
│   ├── layout.tsx       # Root layout and metadata
│   └── globals.css      # Global styles
├── public/              # Static assets
├── package.json
└── README_frontend.md
```

## Features (beta)

- **Prediction form** — postal code, room count, living area (m²)
- **Price display** — formatted in EUR (`fr-FR` locale)
- **Prediction history** — loaded from `GET /predictions` on page load and after each submit

## Configuration

The API base URL is defined in `app/page.tsx`:

```ts
const API_URL = "http://localhost:8000";
```

Change this when deploying (production API domain, env variable in a later iteration).

## Prerequisites

- Node.js 18+ (project tested with Node 24)
- Backend API running on port 8000
- CORS enabled on the backend for the frontend origin

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

- Single page — no routing, auth, or user accounts
- Hardcoded API URL — no `.env.local` yet
- No ad integration — placeholder for future monetization
- No mobile-specific UX polish

## Planned (post-beta)

- Environment-based API URL (`NEXT_PUBLIC_API_URL`)
- Ad slots (e.g. banner / sidebar) without hurting core UX
- SEO landing copy for Haute-Garonne / Toulouse searches
- Error states and loading skeletons
