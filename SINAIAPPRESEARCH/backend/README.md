# Research Study Management API (MVP)

This service delivers the core backend capabilities outlined in the PRD: creating studies, allocating teams, tracking IRB status, assigning budgets, and managing the default study task list.

## Stack

- Node.js + TypeScript + Express
- Prisma ORM targeting PostgreSQL
- Zod for request validation
- Docker Compose for local Postgres, MinIO (document storage stub), Keycloak (OIDC), Mailhog

## Getting Started

1. Copy environment defaults and adjust as needed:
   ```bash
   cp .env.example .env
   ```

2. Start local dependencies:
   ```bash
   docker compose up -d postgres minio keycloak mailhog
   ```

3. Install dependencies and generate the Prisma client:
   ```bash
   npm install
   npx prisma generate
   ```

4. Apply the schema (with migrations) and seed starter data:
   ```bash
   npx prisma migrate deploy
   npm run seed
   ```

5. Launch the API:
   ```bash
   npm run dev
   ```

The service listens on `http://localhost:4000`. Health check at `/health`, API namespace at `/v1`.

## Authentication & Authorization

- All `/v1` routes require a Bearer token issued by the configured OIDC provider (`OIDC_ISSUER`).
- Provide one or more expected audiences in `OIDC_AUDIENCE` (comma-separated). Roles are read from Keycloak-style `realm_access` / `resource_access` claims.
- When `OIDC_ISSUER` is unset (local prototyping), the middleware falls back to a development user with all roles.

Role-based guards are applied to mutating routes (e.g., only `pi` / `coordinator` / `regulatory` can create or update a study, `finance` controls budget edits).

## Seeded Reference Data

The seed script loads roles, personnel, task templates, study types, and a sample study (`Omega-3 in Mild Cognitive Impairment`). Default credentials and object relationships align with the PRD so you can exercise:

- Study creation (with default tasks & IRB submission shell)
- Assignment of people and workload guardrails
- Budget shell + line items
- IRB status transitions and timeline history

## Audit Logging

Every mutating request (studies, assignments, budgets, IRB transitions, task status changes) writes an entry to the `AuditEvent` table, capturing actor, entity, before/after JSON snapshots, and request metadata (IP, user-agent).

## Next Steps

- Wire file uploads to S3/MinIO and track object keys per Document
- Add automated test coverage & CI wiring
- Implement integration adapters (Epic/OnCore/ORCID) behind feature flags
