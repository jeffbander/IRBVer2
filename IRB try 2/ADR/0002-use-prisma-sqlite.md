# ADR-0002: Use Prisma with SQLite for Development

**Status:** Accepted
**Date:** 2025-10-02
**Deciders:** Development Team

## Context

The IRB system needs:
- Type-safe database access
- Migration management
- Development database that's easy to set up
- Production-ready ORM
- Support for complex queries (joins, transactions)

## Decision

Use **Prisma ORM** with **SQLite** for development, designed for easy migration to PostgreSQL in production.

### Specific Choices:
- **ORM:** Prisma 6.16.2 (to be pinned)
- **Dev DB:** SQLite (`prisma/dev.db`)
- **Prod Target:** PostgreSQL (via connection string swap)
- **Schema:** Single `prisma/schema.prisma` file
- **Migrations:** Prisma Migrate

## Consequences

### Positive
- Excellent TypeScript integration with generated types
- Easy local development (no Docker/services needed)
- Visual database browser (Prisma Studio)
- Type-safe queries prevent runtime errors
- Automatic migrations
- Same code works on SQLite and PostgreSQL

### Negative
- SQLite limitations (no concurrent writes, simplified types)
- Must test on PostgreSQL before production
- Vendor lock-in to Prisma
- Migration files in git (can grow large)

### Neutral
- Requires `prisma generate` step in build
- Schema changes need migration creation
- Need to manage connection pooling in production

## Alternatives Considered

1. **Drizzle ORM** - Rejected: Less mature, smaller ecosystem
2. **TypeORM** - Rejected: Decorator-based (not ideal for Next.js)
3. **Raw SQL with kysely** - Rejected: More boilerplate
4. **Direct PostgreSQL** - Rejected: Harder local dev setup

## Test Plan

- All API routes use Prisma client
- Seed script creates test data
- E2E tests validate CRUD operations
- Migration scripts run cleanly
- Performance tests for complex queries

## Migration Notes

### To Production PostgreSQL:

1. Update `.env`:
   ```
   DATABASE_URL="postgresql://user:pass@host:5432/irb"
   ```

2. Run migrations:
   ```bash
   pnpm prisma migrate deploy
   ```

3. Verify connection pooling configured

4. Test full app functionality

## Schema Overview

Key models:
- `User` - Authentication and authorization
- `Role` - RBAC permissions
- `Study` - Clinical study/protocol
- `Participant` - Study subjects
- `Document` - Study documentation
- `AuditLog` - Compliance tracking

## Related

- See `prisma/schema.prisma` for full schema
- See ADR-0001 for framework choice
