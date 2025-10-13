# ADR-0003: Migrate to Zustand for State Management

**Status:** Accepted
**Date:** 2025-10-02
**Deciders:** Development Team

## Context

### Current Problem
The IRB system currently uses `localStorage` for state persistence in 28+ locations:
- Authentication (token, user data)
- UI state (modals, filters)
- Navigation state

**Critical Issues:**
1. **Master Prompt Violation:** Forbids localStorage/sessionStorage
2. **Security Risk:** Tokens in localStorage vulnerable to XSS
3. **No SSR Support:** localStorage breaks server-side rendering
4. **Testing Issues:** Cannot mock localStorage easily in E2E tests
5. **State Sync:** No central state management leads to bugs

### Evidence
```bash
$ grep -r "localStorage" app/ | wc -l
28
```

Files affected:
- `app/login/page.tsx` (3 instances)
- `app/dashboard/page.tsx` (4 instances)
- `app/studies/[id]/page.tsx` (5+ instances)
- `app/participants/page.tsx` (2+ instances)
- And 14+ more files

### Constraints
- Must work with Next.js App Router
- Must support Server Components (stores used in Client Components only)
- Must be type-safe (TypeScript)
- No build-time breaking changes
- Incremental migration path

## Decision

Migrate to **Zustand 4.5.0** for in-memory state management.

### Architecture

```
lib/state/
├── auth.ts          # Authentication state
├── studies.ts       # Study management state
├── ui.ts            # UI state (modals, etc)
└── index.ts         # Re-exports
```

### State Stores

#### 1. Auth Store (`lib/state/auth.ts`)
```typescript
interface AuthState {
  token: string | null;
  user: User | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
}
```

#### 2. Studies Store (`lib/state/studies.ts`)
```typescript
interface StudiesState {
  studies: Study[];
  currentStudy: Study | null;
  setStudies: (studies: Study[]) => void;
  setCurrentStudy: (study: Study | null) => void;
  clearStudies: () => void;
}
```

#### 3. UI Store (`lib/state/ui.ts`)
```typescript
interface UIState {
  modals: Record<string, boolean>;
  filters: Record<string, any>;
  openModal: (id: string) => void;
  closeModal: (id: string) => void;
  setFilter: (key: string, value: any) => void;
}
```

### Storage Service Interface
Create `lib/storage/interface.ts` for future server sync:
```typescript
interface StorageAdapter {
  getToken(): Promise<string | null>;
  setToken(token: string): Promise<void>;
  clearToken(): Promise<void>;
}
```

**Current Implementation:** In-memory only (Zustand)
**Future:** Can swap for HTTP-only cookies, session storage on server, etc.

## Consequences

### Positive
- ✅ **Complies with Master Prompt** - No localStorage usage
- ✅ **Better Security** - Tokens not exposed to JavaScript (future: httpOnly cookies)
- ✅ **SSR Compatible** - State initialization works with Server Components
- ✅ **Type Safety** - Full TypeScript support
- ✅ **Testable** - Easy to mock stores in tests
- ✅ **DevTools** - Zustand has Redux DevTools integration
- ✅ **Minimal Bundle** - Zustand is ~1KB gzipped
- ✅ **Performance** - Selective re-renders via selectors

### Negative
- ⚠️ **State Loss on Refresh** - In-memory only (by design per Master Prompt)
- ⚠️ **Migration Effort** - Must update 28+ files
- ⚠️ **New Dependency** - Adds zustand to bundle
- ⚠️ **Learning Curve** - Team must learn Zustand patterns

### Neutral
- URL query params still allowed for navigation state
- Server-side session management separate concern
- Does not affect database operations (Prisma unchanged)

## Alternatives Considered

### 1. Redux Toolkit
**Rejected:** Too heavy (~15KB), more boilerplate, overkill for this app size

### 2. Jotai
**Rejected:** Atomic model unfamiliar to team, less documentation

### 3. React Context + useReducer
**Rejected:** More boilerplate, performance issues with many consumers

### 4. Server-Side Sessions Only
**Rejected:** Requires server on every navigation, poor UX for client interactions

### 5. Cookies (httpOnly)
**Rejected:** Need client-side state for UI (modals, filters), cookies for auth only (future enhancement)

## Migration Plan

### Phase 1: Setup (1 file change)
1. Install zustand@4.5.0 (pinned in package.json)
2. Create `lib/state/` directory structure

### Phase 2: Create Stores (3 new files)
1. `lib/state/auth.ts` - Authentication store with login/logout
2. `lib/state/studies.ts` - Study management store
3. `lib/state/ui.ts` - UI state store

### Phase 3: Migrate Files (~28 files)
**Order of migration:**
1. `app/login/page.tsx` - Auth first (highest impact)
2. `app/dashboard/page.tsx` - Dashboard second
3. `app/studies/**/*.tsx` - Study pages (bulk)
4. `app/participants/**/*.tsx` - Participant pages
5. `app/documents/**/*.tsx` - Document pages
6. `app/users/**/*.tsx` - User pages
7. `hooks/useAuth.ts` - Update custom hooks

**Per-file checklist:**
- [ ] Replace `localStorage.getItem('token')` with `useAuthStore()`
- [ ] Replace `localStorage.setItem('token', x)` with `login(token, user)`
- [ ] Replace `localStorage.removeItem('token')` with `logout()`
- [ ] Add `'use client'` if not present
- [ ] Test page still loads
- [ ] Verify ESLint passes

### Phase 4: Verification
1. Run ESLint across all files - must pass with no localStorage errors
2. Run Playwright test suite - all tests must pass
3. Manual smoke test - login, navigate, logout
4. Check bundle size - ensure <5KB increase

### Rollback Plan
If critical failure:
1. Git revert to pre-migration commit
2. Re-evaluate approach
3. Consider incremental store-by-store migration

## Test Plan

### Unit Tests (Vitest - to be added)
```typescript
describe('AuthStore', () => {
  it('should login and set token', () => {
    const { login, token } = useAuthStore.getState();
    login('test-token', mockUser);
    expect(useAuthStore.getState().token).toBe('test-token');
  });

  it('should logout and clear state', () => {
    const { logout } = useAuthStore.getState();
    logout();
    expect(useAuthStore.getState().token).toBeNull();
  });
});
```

### E2E Tests (Playwright)
All existing 27 test files must pass:
- `tests/auth.spec.ts` - Login/logout flow
- `tests/dashboard.spec.ts` - Dashboard loads with auth
- `tests/studies.spec.ts` - Study CRUD operations
- `tests/participant-enrollment.spec.ts` - Enrollment flow
- And 23 more...

### Manual Testing
- [ ] Login with valid credentials
- [ ] Token persists during navigation
- [ ] Logout clears state
- [ ] Refresh page requires re-login (expected behavior)
- [ ] Multiple tabs don't share state (expected - in-memory)

## Performance Impact

**Expected:**
- Bundle size: +1KB gzipped (zustand)
- Runtime: Negligible (Zustand is highly optimized)
- Re-renders: Fewer (selective subscriptions vs whole localStorage object)

**Measurement:**
- Before: `npm run build` → check `.next/static` size
- After: Compare bundle sizes
- Accept if delta < 10KB

## Security Improvements

### Before (localStorage)
```typescript
// ❌ Token exposed to any JS on page
localStorage.setItem('token', token);
// ❌ Vulnerable to XSS
```

### After (Zustand)
```typescript
// ✅ Token only in memory during session
useAuthStore.getState().login(token, user);
// ✅ Still vulnerable to XSS but not persistent
// 🔮 Future: Move to httpOnly cookies (separate ADR)
```

## Future Enhancements

### Phase 2 (Future ADR)
- Implement `lib/storage/cookie-adapter.ts` for httpOnly cookies
- Move token storage to server-side session
- Keep UI state in Zustand, auth token in secure cookie
- Add session refresh mechanism

### Phase 3 (Future ADR)
- Add Zustand persist middleware for non-sensitive UI state
- Sync with server on reconnection
- Implement optimistic updates

## Related ADRs
- ADR-0001 (Next.js App Router) - Zustand works with App Router
- ADR-0002 (Prisma) - No impact on database layer
- Future: ADR-0004 (httpOnly Cookies) - Auth security enhancement

## Acceptance Criteria

- [x] ADR-0003 written and approved
- [ ] zustand@4.5.0 installed and pinned
- [ ] All 3 stores created (`auth.ts`, `studies.ts`, `ui.ts`)
- [ ] All 28+ files migrated (no localStorage usage)
- [ ] ESLint passes with no localStorage violations
- [ ] All 27 Playwright tests pass
- [ ] Manual smoke test passes
- [ ] Bundle size increase < 10KB
- [ ] Documentation updated

## Timeline

**Estimated Duration:** 2-3 hours
**Assigned:** Current iteration (Iteration 2)
**Blocker Status:** CRITICAL PATH - tests cannot run until complete

---

**Approved By:** Development Team
**Implementation Date:** 2025-10-02
