# Next Steps - Quick Reference

## Current Status ✅

**Build:** PASSING
**Unit Tests:** 14/14 PASSING
**Dev Server:** Running on port 3000
**E2E Tests:** Infrastructure ready, UI selectors need updates

---

## Immediate Next Steps (Iteration 5)

### 1. Update E2E Test Selectors (High Priority)
The Playwright tests connect successfully but use outdated UI selectors from before the Zustand migration.

**File to fix:** `tests/participant-enrollment-simple.spec.ts`

**Known issues:**
- Line 74: Uses `button:has-text("Enroll")` but actual button text is `"Enroll Participant"`
- Modal selectors may need updates

**How to fix:**
```typescript
// OLD
const enrollButton = page.locator('button:has-text("Enroll")').first();

// NEW
const enrollButton = page.locator('button:has-text("Enroll Participant")').first();
```

**Test command:**
```bash
npx playwright test tests/participant-enrollment-simple.spec.ts --project=chromium --reporter=list
```

### 2. Create Docker Multi-Stage Build
**Files to create:**
- `Dockerfile`
- `docker-compose.yml`
- `.dockerignore`

**Requirements:**
- Development image with hot reload
- Production image with optimized build
- Include database (SQLite for dev, PostgreSQL for prod)

### 3. Set Up GitHub Actions CI/CD
**File to create:** `.github/workflows/ci.yml`

**Jobs needed:**
- Lint and type check
- Run unit tests
- Run E2E tests
- Build production bundle
- Deploy (optional)

### 4. Increase Test Coverage
**Current:** 14 tests (auth + studies stores)
**Target:** 80% coverage

**Areas needing tests:**
- UI store (`lib/state/ui.ts`)
- Validation helpers (`lib/validation.ts`)
- API routes (integration tests)

---

## Quick Commands

### Development
```bash
# Start dev server
npm run dev

# Start Prisma Studio (database GUI)
npx prisma studio

# Run unit tests
npm run test

# Run unit tests with coverage
npm run test:coverage

# Run E2E tests
npx playwright test

# Run specific E2E test
npx playwright test tests/participant-enrollment-simple.spec.ts
```

### Build
```bash
# Production build
npm run build

# Check for TypeScript errors
npm run build 2>&1 | grep -E "error|Error"

# Check for ESLint errors
npm run lint
```

### Database
```bash
# Apply migrations
npx prisma migrate dev

# Reset database
npx prisma migrate reset

# Generate Prisma client
npx prisma generate

# Seed database
npm run seed  # (if seed script exists)
```

---

## Important Files Reference

### Configuration
- `tsconfig.json` - TypeScript config (downlevelIteration enabled)
- `playwright.config.ts` - E2E test config (port 3000)
- `vitest.config.ts` - Unit test config
- `next.config.js` - Next.js config (IRB2 excluded)
- `.eslintrc.json` - ESLint config (localStorage guards)

### State Management (Zustand)
- `lib/state/auth.ts` - Authentication state
- `lib/state/studies.ts` - Study management state
- `lib/state/ui.ts` - UI state (modals, filters, loading)
- `lib/state/index.ts` - Central exports

### Tests
- `__tests__/lib/state/auth.test.ts` - Auth store tests (5 passing)
- `__tests__/lib/state/studies.test.ts` - Studies store tests (9 passing)
- `tests/participant-enrollment-simple.spec.ts` - E2E test (needs UI selector updates)

### Documentation
- `ADR/` - Architecture Decision Records (3 ADRs)
- `artifacts/logs/iteration-4-final-report.md` - Latest session report
- `artifacts/logs/session-final-report.md` - Previous session summary

---

## Known Issues

### ESLint Warnings (Acceptable)
7 `exhaustive-deps` warnings in React Hook useEffect calls. These are false positives because Zustand store functions are stable and don't need to be in dependency arrays.

**To suppress (if desired):**
```javascript
useEffect(() => {
  fetchStudies();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [token]);
```

### E2E Test Selectors
Playwright tests use outdated selectors from pre-Zustand migration. All 27 tests may need selector updates.

**Priority:** High (blocks E2E validation)

### JWT Type Inference
`lib/auth.ts:29` has a `@ts-ignore` comment due to TypeScript's inability to infer string literal types from environment config. Runtime behavior is correct.

**Priority:** Low (cosmetic)

---

## Success Criteria for Next Session

### Definition of Done (Iteration 5)
- [ ] All E2E tests passing (at least 1 smoke test)
- [ ] Docker build working (development)
- [ ] GitHub Actions CI workflow created
- [ ] Test coverage increased (target: 80%)
- [ ] ESLint warnings addressed or suppressed with justification

### Stretch Goals
- [ ] Production Docker image optimized
- [ ] Pre-commit hooks configured (Husky)
- [ ] Performance baselines documented
- [ ] Deployment guide written

---

## Contact Points

### Documentation
- Master Prompt: `artifacts/baseline/observation-report.md`
- Execution Plan: `artifacts/logs/execution-plan.md`
- Latest Report: `artifacts/logs/iteration-4-final-report.md`

### Key Decisions
- ADR-0001: Next.js App Router choice
- ADR-0002: Prisma + SQLite strategy
- ADR-0003: Zustand state management migration

---

## Emergency Troubleshooting

### Build Fails
```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Regenerate Prisma client
npx prisma generate

# Try build again
npm run build
```

### Dev Server Won't Start
```bash
# Check for port conflicts
npx kill-port 3000 3001 3002

# Start server
npm run dev
```

### Tests Fail
```bash
# Clear test cache
npm run test -- --clearCache

# Run with verbose output
npm run test -- --verbose
```

### Database Issues
```bash
# Reset database
npx prisma migrate reset

# Apply all migrations
npx prisma migrate dev
```

---

**Last Updated:** 2025-10-03 04:45 UTC
**Build Status:** ✅ PASSING
**Ready for:** Iteration 5
