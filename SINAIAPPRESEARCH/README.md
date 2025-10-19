# Research Study Platform

This repository houses the emerging MVP for the research study management platform outlined in the PRD. It now ships both the backend API and a React frontend covering the highest-priority workflows: study directory/creation, resource allocation, IRB tracking, budgeting, and task automation.

## Structure

- `backend/` – Node.js + TypeScript API with Prisma schema, seed scripts, and Docker Compose for local infrastructure.
- `frontend/` – Vite + React app with the study workspace UI (token-aware, React Query powered).
- `Research/` – Working memory and templates carried over from earlier planning (no code changes).

## Quick Start

```bash
cd backend
cp .env.example .env
npm install
npx prisma generate
npx prisma migrate deploy
npm run seed
npm run dev
```

Local supporting services (Postgres, MinIO, Keycloak, Mailhog) run via `docker compose up` from the repository root.

Frontend (after backend is running):

```bash
cd frontend
npm install
npm run dev
```

Paste a bearer token into the header field if the backend has OIDC enabled. In local dev without `OIDC_ISSUER`, calls succeed without a token.

## Status

- ✅ Database schema + migrations for core objects (Study, StudyType, Assignments, Tasks, Budgets, IRB submissions, Audit events)
- ✅ REST endpoints for studies, assignments, budgets, tasks, IRB transitions with Zod validation, OIDC auth, and RBAC
- ✅ Seed data, sample study, and curated metadata aligned with the MVP PRD
- ✅ Audit logging on all mutating requests (captured in `AuditEvent`)
- ✅ Frontend workspace (study directory, creation wizard, assignments, budget, tasks, IRB timeline)
- 🚧 Remaining: document upload integration, CI setup, and e2e smoke tests.

Refer to `backend/README.md` and `frontend/README.md` for service-level usage.

## Testing
- Backend: `npm run build` (type-check) and activity-specific commands (see backend README).
- Frontend: `npm run build` for type-check/bundle, `npm run test:e2e` to run Playwright suite (mocks API calls).

## CI
GitHub Actions workflow (`.github/workflows/ci.yml`) runs on push/PR to build the backend, build the frontend, and execute the mocked Playwright end-to-end suite.