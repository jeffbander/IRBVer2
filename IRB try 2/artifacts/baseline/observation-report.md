# IRB System - Baseline Observation Report

**Date:** 2025-10-02
**Phase:** OBSERVE
**Engineer:** Claude Sonnet 4.5

## Executive Summary

The IRB management system is a Next.js 14 + Prisma + TypeScript application with significant technical debt that must be resolved before production deployment.

## Critical Blockers (Must Fix)

### 1. localStorage Violations (SEVERITY: CRITICAL)
- **Count:** 28+ violations across app/ directory
- **Files affected:**
  - `app/dashboard/page.tsx` (4 violations)
  - `app/login/page.tsx` (3 violations)
  - `app/documents/page.tsx` (1 violation)
  - `app/page.tsx` (1 violation)
  - `app/participants/page.tsx` (1 violation)
  - And 18+ more across studies pages
- **Impact:** Master Prompt explicitly forbids client-side storage
- **Fix:** Implement in-memory state management (Zustand) with service interface

### 2. Package Manager Non-Compliance (SEVERITY: CRITICAL)
- **Current:** Using npm with package-lock.json
- **Required:** pnpm >=9 with pnpm-lock.yaml
- **Impact:** Non-deterministic builds, larger node_modules
- **Fix:** Migrate to pnpm, create .npmrc, update all scripts

### 3. Dependency Violations (SEVERITY: HIGH)
```json
"dependencies": {
  "@prisma/client": "^6.16.2",  // ❌ Caret - should be pinned
  "bcryptjs": "^3.0.2",          // ❌ Caret
  "express-session": "^1.18.2",  // ❌ Caret
  "jsonwebtoken": "^9.0.2",      // ❌ Caret
  "next": "14.2.5",              // ✅ Pinned (but old)
  "react": "^18.3.1",            // ❌ Caret
  "react-dom": "^18.3.1"         // ❌ Caret
}
```
**Impact:** Non-reproducible builds, version drift
**Fix:** Pin all runtime deps, allow ^ only on devDeps

## Test Infrastructure Gaps

### Playwright Configuration Issues
- **Port mismatch:** Config uses 3002, app runs on 3001/3000
- **Missing browsers:** Only Chromium configured (need Firefox, WebKit)
- **Missing artifacts:** No video retention on failure
- **Test count:** 27 test files (good coverage quantity, quality unknown)

### Missing Test Infrastructure
- ❌ No unit tests (Vitest not installed)
- ❌ No coverage reporting
- ❌ No a11y tests
- ❌ No performance baselines

## Missing Production Infrastructure

### Documentation & Governance
- ❌ No ADR/ directory for architectural decisions
- ❌ No docs/ARCH/ for architecture documentation
- ❌ No docs/OPERATIONS.md runbook
- ❌ No ADR/deps.md dependency justifications

### Build & Deploy
- ❌ No .npmrc for pnpm config
- ❌ No Docker multi-stage build
- ❌ No .env.example
- ❌ No CI/CD pipeline (.github/workflows/)
- ❌ No ESLint storage API guards

### Code Organization
- ⚠️ Duplicate IRB2/ directory (unclear purpose)
- ⚠️ No workspace structure for multi-package layout
- ⚠️ No interface/ directory for shared types

## Current Architecture

### Tech Stack
- **Framework:** Next.js 14.2.5 (App Router)
- **Database:** Prisma + SQLite (dev.db)
- **Auth:** JWT + bcrypt
- **UI:** Tailwind CSS
- **Testing:** Playwright (27 test files)

### Directory Structure
```
app/              # Next.js App Router pages & API routes
  api/           # REST API endpoints
  dashboard/     # Dashboard page
  studies/       # Study management
  participants/  # Participant management
  users/         # User management
lib/             # Shared utilities (auth, prisma, validation)
components/      # React components
hooks/           # Custom React hooks
prisma/          # Database schema
tests/           # Playwright E2E tests (27 files)
IRB2/            # ⚠️ Duplicate/legacy code?
```

## Codebase Metrics

- **TypeScript files:** ~50+ source files
- **API routes:** ~20+ endpoints
- **Pages:** ~15+ pages
- **Tests:** 27 Playwright test files
- **localStorage violations:** 28+

## Next Steps (PLAN Phase)

1. **IMMEDIATE (Diff Batch 1-4):**
   - Create ADR/ structure and initial docs
   - Add ESLint guards for localStorage/sessionStorage
   - Fix Playwright config (ports, browsers, artifacts)
   - Create .npmrc and prepare pnpm migration

2. **HIGH PRIORITY (Migration):**
   - Migrate npm → pnpm (requires full rewrite proposal)
   - Implement Zustand state management
   - Remove all localStorage usage
   - Pin dependency versions

3. **INFRASTRUCTURE:**
   - Add Vitest + coverage
   - Create Docker multi-stage build
   - Add CI/CD pipeline
   - Create .env.example

## Risk Assessment

**HIGH RISK:**
- localStorage violations will fail production security audits
- Unpinned dependencies create deployment instability
- Missing CI/CD means no automated quality gates

**MEDIUM RISK:**
- Port configuration issues will cause test failures
- No coverage measurement = unknown quality
- Duplicate IRB2/ code may cause confusion

**LOW RISK:**
- Test quantity appears adequate (27 files)
- Modern tech stack (Next.js 14, TypeScript, Prisma)
