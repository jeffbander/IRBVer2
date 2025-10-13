# IRB Management System - Complete Routes & Testing Guide

**Server:** http://localhost:3002
**Last Updated:** October 4, 2025

---

## 🗺️ Complete Route Map

### **Public Routes** (No Auth Required)
| Route | Type | Purpose |
|-------|------|---------|
| `/` | Page | Landing/Login redirect |
| `/login` | Page | User authentication |
| `/api/auth?action=login` | API | Login endpoint |
| `/api/auth?action=register` | API | User registration |
| `/api/health` | API | Health check |

### **Protected Routes** (Auth Required)

#### **Dashboard & Navigation**
| Route | Type | Access | Purpose |
|-------|------|--------|---------|
| `/dashboard` | Page | All authenticated | Main dashboard with stats |
| `/api/dashboard/stats` | API | All authenticated | Dashboard statistics |

#### **Studies Management**
| Route | Type | Access | Purpose |
|-------|------|--------|---------|
| `/studies` | Page | All | List all studies |
| `/studies/new` | Page | Researcher+ | Create new study |
| `/studies/[id]` | Page | All | View study details |
| `/studies/[id]/edit` | Page | PI/Admin | Edit study |
| `/studies/[id]/participants` | Page | All | Manage participants |
| `/studies/[id]/participants/[participantId]` | Page | All | View participant details |
| `/api/studies` | API (GET) | All | Fetch studies list |
| `/api/studies` | API (POST) | Researcher+ | Create study |
| `/api/studies/[id]` | API (GET) | All | Get study details |
| `/api/studies/[id]` | API (PUT) | PI/Admin | Update study |
| `/api/studies/[id]` | API (DELETE) | Admin | Delete study |
| `/api/studies/[id]/review` | API (POST) | Reviewer+ | Submit/approve/activate study |
| `/api/studies/export` | API (GET) | All | Export studies CSV |

#### **Participants Management**
| Route | Type | Access | Purpose |
|-------|------|--------|---------|
| `/participants` | Page | All | Global participants list |
| `/api/participants` | API (GET) | All | Fetch participants |
| `/api/participants` | API (POST) | Coordinator+ | Create participant |
| `/api/studies/[id]/participants` | API (GET) | All | Get study participants |
| `/api/studies/[id]/participants` | API (POST) | Coordinator+ | Enroll participant |
| `/api/studies/[id]/participants/[participantId]` | API (GET) | All | Get participant details |
| `/api/studies/[id]/participants/[participantId]` | API (PUT) | Coordinator+ | Update participant |
| `/api/studies/[id]/participants/export` | API (GET) | All | Export participants CSV |

#### **Documents Management**
| Route | Type | Access | Purpose |
|-------|------|--------|---------|
| `/documents` | Page | All | Global documents list |
| `/api/documents` | API (GET) | All | Fetch all documents |
| `/api/studies/[id]/documents` | API (GET) | All | Get study documents |
| `/api/studies/[id]/documents` | API (POST) | All | Upload document |
| `/api/studies/[id]/documents/[documentId]` | API (GET) | All | Download document |
| `/api/studies/[id]/documents/[documentId]` | API (DELETE) | PI/Admin | Delete document |

#### **User Management**
| Route | Type | Access | Purpose |
|-------|------|--------|---------|
| `/users` | Page | Admin | User management |
| `/users/[id]` | Page | Admin | View/edit user |
| `/api/users` | API (GET) | Admin | Fetch users |
| `/api/users` | API (POST) | Admin | Create user |
| `/api/users/[id]` | API (GET) | Admin | Get user details |
| `/api/users/[id]` | API (PUT) | Admin | Update user |
| `/api/users/[id]` | API (DELETE) | Admin | Delete user |

#### **Audit Logs**
| Route | Type | Access | Purpose |
|-------|------|--------|---------|
| `/audit-logs` | Page | Admin | View audit logs |
| `/api/audit-logs` | API (GET) | Admin | Fetch audit logs |

#### **Test/Utility**
| Route | Type | Access | Purpose |
|-------|------|--------|---------|
| `/api/test/cleanup` | API (POST) | Test only | Clean test data |
| `/api/auth/seed` | API (POST) | Dev only | Seed database |

---

## 🧪 Comprehensive Testing Plan

### **Test Suite 1: Authentication & Authorization**
```typescript
// tests/auth-flow.spec.ts
✅ Should display login page
✅ Should reject invalid credentials
✅ Should login with valid credentials
✅ Should redirect to dashboard after login
✅ Should logout successfully
✅ Should protect routes when not authenticated
✅ Should register new user
✅ Should enforce role-based permissions
```

### **Test Suite 2: Study Management Workflow**
```typescript
// tests/study-workflow.spec.ts
✅ Should create new study (DRAFT status)
✅ Should edit study details
✅ Should submit study for review (PENDING_REVIEW)
✅ Should approve study (APPROVED status)
✅ Should activate study (ACTIVE status)
✅ Should suspend study
✅ Should complete study
✅ Should delete study (admin only)
✅ Should export studies to CSV
```

### **Test Suite 3: Participant Enrollment**
```typescript
// tests/participant-enrollment.spec.ts
✅ Should enroll new participant
✅ Should prevent duplicate enrollment
✅ Should update participant status
✅ Should withdraw participant with reason
✅ Should track enrollment history
✅ Should export participants to CSV
✅ Should validate participant data
```

### **Test Suite 4: Document Management**
```typescript
// tests/document-management.spec.ts
✅ Should upload document (PDF, Word, Excel)
✅ Should validate file type
✅ Should enforce 10MB file size limit
✅ Should download document
✅ Should delete document
✅ Should track document versions
✅ Should display document metadata
```

### **Test Suite 5: User Management (Admin)**
```typescript
// tests/user-management.spec.ts
✅ Should create new user
✅ Should assign role to user
✅ Should update user details
✅ Should deactivate user
✅ Should enforce admin-only access
✅ Should display user audit logs
```

### **Test Suite 6: Audit & Compliance**
```typescript
// tests/audit-logs.spec.ts
✅ Should log all user actions
✅ Should filter logs by user
✅ Should filter logs by entity
✅ Should filter logs by date range
✅ Should display user details in logs
✅ Should track IP addresses
✅ Should export audit logs
```

### **Test Suite 7: Dashboard & Statistics**
```typescript
// tests/dashboard.spec.ts
✅ Should display study count
✅ Should display participant count
✅ Should display pending reviews
✅ Should show recent activity
✅ Should update in real-time
```

### **Test Suite 8: Error Handling**
```typescript
// tests/error-handling.spec.ts
✅ Should handle 404 (not found)
✅ Should handle 401 (unauthorized)
✅ Should handle 403 (forbidden)
✅ Should handle 500 (server error)
✅ Should display user-friendly error messages
✅ Should log errors to audit trail
```

### **Test Suite 9: Data Validation**
```typescript
// tests/validation.spec.ts
✅ Should validate required fields
✅ Should validate email format
✅ Should validate date ranges
✅ Should validate file types
✅ Should sanitize input (XSS prevention)
✅ Should prevent SQL injection
```

### **Test Suite 10: Rate Limiting & Security**
```typescript
// tests/security.spec.ts
✅ Should rate limit auth attempts (5/15min)
✅ Should rate limit read operations (300/15min)
✅ Should rate limit write operations (30/15min)
✅ Should enforce CORS policies
✅ Should hash passwords with bcrypt
✅ Should use secure JWT tokens
```

---

## 🐛 Known Issues & Fixes Needed

### **Issue 1: Build Cache Corruption** ⚠️
**Status:** RECURRING
**Symptoms:** API returns HTML instead of JSON
**Current Workaround:** Clear `.next` and restart server
**Permanent Fix Needed:** Investigate webpack config, consider separate build for API routes

### **Issue 2: Zustand State Persistence** 🔴
**Status:** CRITICAL
**Impact:** Auth state lost on page navigation
**Fix:** Implement encrypted localStorage persistence
**Priority:** HIGH

### **Issue 3: Rate Limiting in Tests** ⚠️
**Status:** BLOCKING E2E
**Impact:** Tests fail due to rate limits
**Fix:** Add test environment detection
```typescript
if (process.env.NODE_ENV === 'test' || process.env.PLAYWRIGHT_TEST) {
  return null; // Skip rate limiting
}
```

### **Issue 4: Port Conflicts** ⚠️
**Status:** ONGOING
**Current:** Running on port 3002 (3000, 3001 in use)
**Fix:** Kill conflicting processes or document port usage

### **Issue 5: Document Upload Webpack Error** 🔴
**Status:** IDENTIFIED
**Error:** `TypeError: __webpack_modules__[moduleId] is not a function`
**Fix:** Clean build cache (done), monitor for recurrence

---

## 🚀 Testing Commands

### **Run All Tests**
```bash
# Unit tests
npm test

# E2E tests (headless)
npx playwright test

# E2E tests (headed - visible browser)
npx playwright test --headed

# Single test file
npx playwright test tests/study-workflow.spec.ts --headed

# Debug mode
npx playwright test --debug
```

### **Test Specific Flows**
```bash
# Test auth flow
npx playwright test tests/auth-flow.spec.ts --headed

# Test participant enrollment
npx playwright test tests/participant-enrollment.spec.ts --headed

# Test document upload
npx playwright test tests/document-management.spec.ts --headed
```

### **Test Coverage**
```bash
# Generate coverage report
npm run test:coverage

# View coverage
open artifacts/coverage/index.html
```

---

## ✅ Testing Checklist

### **Manual Testing (Headed Mode)**
- [ ] Login flow
- [ ] Create study
- [ ] Submit study for review
- [ ] Approve study
- [ ] Activate study
- [ ] Enroll participant
- [ ] Upload document
- [ ] Download document
- [ ] View audit logs
- [ ] Export data (CSV)
- [ ] User management (admin)
- [ ] Error scenarios (404, 401, 500)
- [ ] Rate limiting behavior
- [ ] Logout flow

### **Automated Testing**
- [x] 68 Unit tests passing
- [ ] 27 E2E tests (blocked by state persistence)
- [ ] All API routes tested
- [ ] All UX flows covered
- [ ] Security tests passing
- [ ] Performance benchmarks

---

## 📊 Test Results Summary

### **Current Status:**
- **Unit Tests:** 68/68 ✅
- **E2E Tests:** 0/27 ⚠️ (blocked by Zustand persistence)
- **Manual Tests:** Pending
- **Security Tests:** Pending

### **Blockers:**
1. Zustand state persistence missing
2. Rate limiting blocks test auth
3. Build cache corruption recurring

### **Next Steps:**
1. Fix Zustand persistence (encrypted localStorage)
2. Add test environment detection
3. Create comprehensive E2E suite
4. Run full manual test in headed mode
5. Document all findings
