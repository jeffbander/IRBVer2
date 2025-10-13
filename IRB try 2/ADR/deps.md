# Dependency Justifications

This living document explains why each dependency exists.

**Last Updated:** 2025-10-02
**Policy:** All new deps must add an entry here before merging.

---

## Runtime Dependencies

### Framework & Core

| Package | Version | Justification |
|---------|---------|---------------|
| `next` | 14.2.5 | Web framework (see ADR-0001) |
| `react` | 18.3.1 | UI library, required by Next.js |
| `react-dom` | 18.3.1 | React DOM renderer, required by Next.js |

### Database & ORM

| Package | Version | Justification |
|---------|---------|---------------|
| `@prisma/client` | 6.16.2 | Type-safe database client (see ADR-0002) |

### Authentication & Security

| Package | Version | Justification |
|---------|---------|---------------|
| `bcryptjs` | 3.0.2 | Password hashing (OWASP recommended, pure JS) |
| `jsonwebtoken` | 9.0.2 | JWT creation/verification for stateless auth |
| `express-session` | 1.18.2 | Session management (currently unused, candidate for removal) |

**Note:** `express-session` is not currently used. Consider removing in next audit.

---

## Development Dependencies

### TypeScript & Types

| Package | Version | Justification |
|---------|---------|---------------|
| `typescript` | ^5 | Type safety, IDE support |
| `@types/node` | ^20.19.18 | Node.js type definitions |
| `@types/react` | ^18 | React type definitions |
| `@types/react-dom` | ^18 | React DOM type definitions |
| `@types/bcryptjs` | ^2.4.6 | bcryptjs type definitions |
| `@types/jsonwebtoken` | ^9.0.10 | JWT type definitions |
| `@types/express-session` | ^1.18.2 | Session types (candidate for removal) |

### Build & Tooling

| Package | Version | Justification |
|---------|---------|---------------|
| `postcss` | ^8.4.39 | CSS processing, required by Tailwind |
| `autoprefixer` | ^10.4.19 | Browser prefix automation for Tailwind |
| `tailwindcss` | ^3.4.6 | Utility-first CSS framework |

### Testing

| Package | Version | Justification |
|---------|---------|---------------|
| `@playwright/test` | ^1.55.1 | E2E testing framework |
| `prisma` | ^6.16.2 | DB migrations and Prisma Studio |

### Linting

| Package | Version | Justification |
|---------|---------|---------------|
| `eslint` | ^8 | Code quality and consistency |
| `eslint-config-next` | 14.2.5 | Next.js specific linting rules |

---

## Planned Additions

### Next Iteration

| Package | Version | Justification | ADR |
|---------|---------|---------------|-----|
| `zustand` | 4.5.0 | In-memory state management | TBD |
| `vitest` | ^1.0.0 | Unit testing framework | TBD |
| `@vitest/coverage-v8` | ^1.0.0 | Test coverage reporting | TBD |

---

## Dependency Audit Log

### 2025-10-02 - Initial Audit

**Issues Found:**
1. All runtime deps use `^` (caret) - violates Master Prompt
2. `express-session` appears unused
3. Missing essential deps: zustand, vitest, husky

**Actions:**
- [ ] Pin all runtime dependencies (remove ^)
- [ ] Audit express-session usage, remove if unused
- [ ] Add zustand for state management
- [ ] Add vitest for unit tests
- [ ] Add husky for git hooks

---

## Removal Policy

Before removing a dependency:
1. Search codebase for imports
2. Check transitive dependencies
3. Run full test suite
4. Update this file with removal note
5. Document in git commit message
