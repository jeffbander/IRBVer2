# Manual Testing Checklist - Aigents Integration

**Server**: http://localhost:3002
**Date**: October 6, 2025

## ✅ Pre-Testing Setup

- [x] Database reset and seeded
- [x] Server running on port 3002
- [x] All code compiled successfully

## 🔑 Test Credentials

- **PI**: `pi@example.com` / `password123`
- **Reviewer**: `reviewer@example.com` / `password123`
- **Admin**: `admin@example.com` / `admin123`

---

## 🧪 Test Suite

### 1. Authentication & Login

**Test**: Login as PI
- [ ] Navigate to http://localhost:3002
- [ ] Click "Login" or navigate to `/login`
- [ ] Enter: `pi@example.com` / `password123`
- [ ] Click "Login"
- [ ] **Expected**: Redirect to dashboard
- [ ] **Expected**: See welcome message with user name

**Test**: Login as Reviewer
- [ ] Logout
- [ ] Login with: `reviewer@example.com` / `password123`
- [ ] **Expected**: Successful login to dashboard

---

### 2. Study Creation

**Test**: Create new study (as PI)
- [ ] Navigate to `/studies/new`
- [ ] Fill in form:
  - Title: "Aigents Test Study"
  - Protocol Number: "TEST-2025-001"
  - Description: "This is a comprehensive test study for Aigents AI integration functionality testing."
  - Phase: "Phase II"
  - Target Enrollment: "50"
- [ ] Click "Create Study"
- [ ] **Expected**: Redirect to study details page
- [ ] **Expected**: Study shows "DRAFT" status

---

### 3. Document Upload

**Test**: Upload protocol document
- [ ] On study details page, find "Documents" section
- [ ] Click "+ Upload" button
- [ ] Fill in document details:
  - Document Name: "Study Protocol v1.0"
  - Document Type: "PROTOCOL"
  - Description: "Main study protocol"
  - Version: "1.0"
- [ ] Select a file (any PDF or text file)
- [ ] Click "Upload"
- [ ] **Expected**: Document appears in list
- [ ] **Expected**: Document shows name, type, and version

**Test**: Upload consent form
- [ ] Click "+ Upload" again
- [ ] Fill in:
  - Document Name: "Informed Consent Form"
  - Document Type: "CONSENT_FORM"
- [ ] Select a file
- [ ] Click "Upload"
- [ ] **Expected**: Second document appears in list

---

### 4. Aigents Integration - Send to AI

**Test**: Send protocol to Aigents
- [ ] Find "Study Protocol v1.0" in documents list
- [ ] Click "Send to Aigents" button
- [ ] **Expected**: Modal opens with title "Send to Aigents AI"
- [ ] **Expected**: Shows document name and type
- [ ] **Expected**: Dropdown shows available chains
- [ ] Select "Protocol Analyzer" from dropdown
- [ ] **Expected**: Shows description: "Analyzes research protocols..."
- [ ] Click "Send to Aigents" button
- [ ] **Expected**: Alert shows success message with Run ID
- [ ] **Expected**: Modal closes
- [ ] **Expected**: Document shows status badge "AI: completed" (mock mode)

**Test**: Send consent form to Aigents
- [ ] Find "Informed Consent Form" in documents list
- [ ] Click "Send to Aigents"
- [ ] **Expected**: Modal shows "Consent Form Reviewer" in dropdown
- [ ] Select "Consent Form Reviewer"
- [ ] Click "Send to Aigents"
- [ ] **Expected**: Success message
- [ ] **Expected**: Status badge "AI: completed"

---

### 5. Aigents Integration - View Analysis

**Test**: View protocol analysis
- [ ] Find "Study Protocol v1.0" with "AI: completed" badge
- [ ] Click "View Analysis" button
- [ ] **Expected**: Analysis modal opens
- [ ] **Expected**: Shows "AI Analysis" title
- [ ] **Expected**: Shows document name
- [ ] **Expected**: Shows chain badge "Protocol Analyzer"
- [ ] **Expected**: Shows Run ID
- [ ] **Expected**: Analysis text includes:
  - "Protocol Analysis Complete"
  - "Key Findings"
  - "Study Duration"
  - "Target Enrollment"
  - "Action Items"
- [ ] Click "Close" button
- [ ] **Expected**: Modal closes

**Test**: View consent form analysis
- [ ] Find "Informed Consent Form"
- [ ] Click "View Analysis"
- [ ] **Expected**: Analysis shows "Consent Form Review Complete"
- [ ] **Expected**: Shows compliance check items
- [ ] **Expected**: Shows action items

---

### 6. Aigents Integration - Re-analyze

**Test**: Re-analyze document
- [ ] Find document with "AI: completed" status
- [ ] **Expected**: Button now says "Re-analyze" instead of "Send to Aigents"
- [ ] Click "Re-analyze"
- [ ] **Expected**: Chain selection modal opens
- [ ] Select "Document Analyzer" (different chain)
- [ ] Click "Send to Aigents"
- [ ] **Expected**: Success message
- [ ] Refresh page
- [ ] **Expected**: Chain name updated to "Document Analyzer"

---

### 7. Participant Enrollment

**Test**: Approve study first
- [ ] Logout and login as Reviewer: `reviewer@example.com` / `password123`
- [ ] Navigate to Studies
- [ ] Find "Aigents Test Study"
- [ ] Click to open
- [ ] Look for "Review Study" or status change option
- [ ] Change status to "ACTIVE" (if not already)

**Test**: Enroll participant (as PI)
- [ ] Logout and login as PI
- [ ] Navigate to study
- [ ] Click "+ Enroll" button (in Participants section)
- [ ] Fill in enrollment form:
  - Subject ID: "SUBJ-001"
  - Consent Date: (yesterday's date)
  - Enrollment Date: (today's date)
  - Site: "Main Campus"
  - Notes: "First participant enrolled"
- [ ] Click "Enroll Participant"
- [ ] **Expected**: Participant count increases to 1
- [ ] **Expected**: Progress bar shows 1/50

**Test**: View participant details
- [ ] Click "View All Participants →"
- [ ] **Expected**: Shows participant list
- [ ] **Expected**: Shows SUBJ-001
- [ ] **Expected**: Shows enrollment date
- [ ] **Expected**: Shows status

---

### 8. Permission Controls

**Test**: Reviewer cannot upload documents
- [ ] Login as Reviewer
- [ ] Navigate to a study
- [ ] **Expected**: "+ Upload" button is NOT visible
- [ ] **Expected**: Cannot see "Send to Aigents" button

**Test**: Reviewer cannot enroll participants
- [ ] As Reviewer, on study page
- [ ] **Expected**: "+ Enroll" button is NOT visible or disabled

---

### 9. Dashboard & Navigation

**Test**: Dashboard stats
- [ ] Login as PI
- [ ] Navigate to `/dashboard`
- [ ] **Expected**: Shows study count
- [ ] **Expected**: Shows participant count
- [ ] **Expected**: Shows recent activity

**Test**: Study list
- [ ] Navigate to `/studies`
- [ ] **Expected**: Shows all studies
- [ ] **Expected**: Can filter/search (if implemented)
- [ ] **Expected**: Shows study status badges

---

## 📊 Test Results Summary

**Total Tests**: 25
**Passed**: ___ / 25
**Failed**: ___ / 25
**Blocked**: ___ / 25

### Issues Found

| # | Test | Issue Description | Severity |
|---|------|-------------------|----------|
| 1 |      |                   |          |
| 2 |      |                   |          |
| 3 |      |                   |          |

---

## ✅ Success Criteria

For a successful test run, the following must be verified:

- [x] All authentication flows work
- [ ] Study creation and management works
- [ ] Document upload functions correctly
- [ ] Aigents "Send to AI" works (mock mode)
- [ ] Aigents analysis displays correctly
- [ ] Re-analyze functionality works
- [ ] Participant enrollment works
- [ ] Permission controls enforce correctly
- [ ] Dashboard displays accurate data
- [ ] No console errors in browser
- [ ] No server errors in terminal

---

## 🐛 Known Issues

1. **Playwright tests timing out** - Tests configured for port 3000/3001 but server on 3002
2. **Port conflicts** - Multiple dev server instances may cause port changes

---

## 📝 Notes

- Mock mode is enabled (`USE_AIGENTS_MOCK=true`)
- All AI analysis results are generated locally
- No actual Aigents API calls are made
- Database: SQLite development (`dev.db`)
- Server: http://localhost:3002

---

**Tester**: ___________________
**Date**: ___________________
**Time**: ___________________
**Build**: Production build successful
**Git Commit**: Latest (Aigents integration complete)
