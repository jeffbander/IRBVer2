# Research Study Frontend

Single-page React app (Vite + TypeScript) that connects to the research-study backend for study orchestration. It surfaces the MVP flows from the PRD: directory + creation wizard, study workspace (assignments, budget, IRB tracking, tasks), and auth token management.

## Prerequisites
- Node.js 18+
- Backend API running locally (`npm run dev` from `../backend`, `docker compose up` for Postgres/Keycloak/etc.)

Optional: set `VITE_API_BASE_URL` in a `.env` file (see `.env.example`, defaults to `http://localhost:4000/v1`).

## Getting started
```bash
cd frontend
npm install
npm run dev
```
The dev server runs on http://localhost:5173.

### Auth token
Backend supports bearer tokens via OIDC (Keycloak). In local/dev mode without an issuer configured the API accepts requests without a token. When running against a real IdP:
1. Obtain a user access token.
2. Paste it into the “Bearer token” field in the header bar and click *Apply*.

Tokens are stored in `localStorage` and applied to every request.

## Features
- **React Query Devtools** available in dev mode (toggle via panel icon)
- **Study directory**: search by title/sponsor, filter by PI or lifecycle status, quick status badges.
- **Create study**: wizard uses live study types + PI roster (fetched from backend metadata).
- **Study workspace**
  - Summary block (PI, type, risk, sites)
  - Team assignments with effort guardrails (create/delete)
  - Budget summary + line items
  - Task list with inline status updates
  - IRB pane (current status, transitions, path, history timeline)
- **Metadata fetches**: study types, roles, people from new `/v1/meta/*` endpoints.
- **React Query** handles caching/invalidation; axios base client respects the bearer token.

## Scripts
- `npm run dev` – Vite dev server with HMR.
- `npm run build` – Type-check and create production bundle under `dist/`.
- `npm run preview` – Preview production build locally.

## Project structure
```
src/
  api/               REST client wrappers
  components/        Reusable UI primitives
  context/           Auth token context
  layout/            App chrome (header + nav)
  pages/             Route-level views
  providers/         React Query setup
  types/             Shared API contracts
```

The frontend assumes the backend schema described in `backend/README.md`. Update both layers together if schemas change.

## Testing
- `npm run build` – type-check and build production bundle.
- `npm run test:e2e` – run Playwright end-to-end suite (mocks backend calls).
  - First run `npx playwright install` to download browsers.
  - Tests spin up the Vite dev server automatically and intercept API calls with fixtures.

## CI
The GitHub Actions pipeline runs `npm run build` and `npm run test:e2e` (mocked flow) on every push/PR. Adjust `.github/workflows/ci.yml` to add more Targeted checks as needed.