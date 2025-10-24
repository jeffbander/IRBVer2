# IRB Management System - Functional Specification for UX Design
## Complete System Functionality & User Workflows

**Purpose:** This document provides all technical and functional details needed to design accurate, user-centered interfaces in Figma.

**For:** UX/UI Designers, Figma AI, Design Teams

**Last Updated:** January 2025

---

## 📋 Table of Contents

1. [System Overview](#system-overview)
2. [User Roles & Permissions](#user-roles--permissions)
3. [Core Workflows](#core-workflows)
4. [Page-by-Page Specifications](#page-by-page-specifications)
5. [Data Models & Relationships](#data-models--relationships)
6. [API Endpoints](#api-endpoints)
7. [Interactive Components](#interactive-components)
8. [States & Status Indicators](#states--status-indicators)
9. [Special Features](#special-features)
10. [Design Constraints & Requirements](#design-constraints--requirements)

---

## 1. System Overview

### What is this system?

An **IRB (Institutional Review Board) Management System** for Mount Sinai Health System that streamlines the research protocol review process, participant enrollment, and regulatory compliance tracking.

### Primary Goals

1. **Streamline Protocol Review** - Reduce review time from weeks to days
2. **Ensure Compliance** - Maintain complete audit trail for regulatory requirements
3. **Enable Collaboration** - Connect PIs, reviewers, coordinators, and administrators
4. **Automate Document Processing** - OCR and AI analysis of submitted documents
5. **Track Participants** - Manage enrollment, visits, and payments

### Tech Stack (for context)

- **Frontend:** Next.js 14, React, Tailwind CSS
- **Backend:** Next.js API Routes, PostgreSQL (via SQLite in dev)
- **AI/Automation:** Aigents API (document analysis), Mistral AI (OCR)
- **Authentication:** JWT-based auth with role-based permissions

---

## 2. User Roles & Permissions

### Role Hierarchy

```
Admin
  └─ Full system access
Reviewer (IRB Board Member)
  └─ Review protocols, approve/reject, provide feedback
Principal Investigator (PI) / Researcher
  └─ Create studies, upload documents, enroll participants
Coordinator
  └─ Assist with enrollment, document uploads, visit tracking
```

### Permission Matrix

| Action | Admin | Reviewer | PI/Researcher | Coordinator |
|--------|-------|----------|---------------|-------------|
| Create Study | ✅ | ❌ | ✅ | ❌ |
| Edit Own Study | ✅ | ❌ | ✅ | ❌ |
| Submit for Review | ✅ | ❌ | ✅ | ❌ |
| Review Studies | ✅ | ✅ | ❌ | ❌ |
| Approve/Reject | ✅ | ✅ | ❌ | ❌ |
| Assign Reviewers | ✅ | ❌ | ❌ | ❌ |
| Enroll Participants | ✅ | ❌ | ✅ | ✅ |
| Upload Documents | ✅ | ❌ | ✅ | ✅ |
| View Audit Logs | ✅ | ✅ | ❌ | ❌ |
| Manage Users | ✅ | ❌ | ❌ | ❌ |
| Export Data | ✅ | ✅ | ✅ (own studies) | ❌ |
| Assign Coordinators | ✅ | ❌ | ✅ (own studies) | ❌ |

---

## 3. Core Workflows

### Workflow 1: Study Submission & Review

```
1. PI Creates Study
   ↓
2. PI Uploads Protocol Documents
   ↓
3. System performs OCR + AI Analysis (automatic)
   ↓
4. PI Reviews AI Summary
   ↓
5. PI Submits for IRB Review (status: DRAFT → PENDING_REVIEW)
   ↓
6. Admin Assigns Reviewer
   ↓
7. Reviewer Reviews Protocol
   ↓
8. Reviewer Approves OR Requests Changes
   ↓
   ├─ If Approved: Status → APPROVED
   └─ If Changes: Status → DRAFT, PI revises and resubmits
```

### Workflow 2: Participant Enrollment

```
1. Coordinator Opens Study Detail
   ↓
2. Clicks "Enroll Participant"
   ↓
3. Fills out participant form:
   - Subject ID (IRB identifier)
   - Demographics (if allowed by protocol)
   - Group assignment (Treatment/Control)
   - Consent date
   ↓
4. Uploads consent form document
   ↓
5. System creates participant record
   ↓
6. Study enrollment count increments
   ↓
7. Participant appears in study's participant list
```

### Workflow 3: Document Upload & AI Analysis

```
1. User uploads document (PDF, image, etc.)
   ↓
2. System checks file type
   ↓
3. If supported → OCR extraction starts (automatic)
   ↓
4. OCR status: pending → processing → completed
   ↓
5. User can trigger AI Analysis (Aigents)
   ↓
6. Aigents processes document asynchronously
   ↓
7. Webhook receives analysis results
   ↓
8. Analysis displayed in modal/panel
```

### Workflow 4: Coordinator Assignment

```
1. PI or Admin opens Study Detail
   ↓
2. Navigates to "Coordinators" tab
   ↓
3. Clicks "Add Coordinator"
   ↓
4. Searches for coordinator by name/email
   ↓
5. Selects coordinator from list
   ↓
6. Coordinator added to study
   ↓
7. Coordinator gets access to study in their dashboard
```

---

## 4. Page-by-Page Specifications

### 4.1 Login Page (`/login`)

**Purpose:** Authenticate users

**Layout:**
- Left side: Mount Sinai branding, imagery
- Right side: Login form

**Form Fields:**
- Email (required, type: email)
- Password (required, type: password, masked)
- "Remember me" checkbox (optional)
- "Login" button (primary CTA)
- "Forgot password?" link (future feature)

**States:**
- Default
- Loading (spinner on button)
- Error (red alert banner)
- Success (redirect to dashboard)

**API:** `POST /api/auth`
- Input: `{ email, password }`
- Success: Returns JWT token + user object
- Error: 401 Unauthorized

---

### 4.2 Dashboard (`/dashboard`)

**Purpose:** Overview of user's activities and system stats

**Role-Specific Views:**

#### Admin/Reviewer Dashboard

**Stat Cards (4 across):**
1. **Active Studies**
   - Number: Count of studies with status ACTIVE
   - Subtitle: "+X this month"
   - Color: Cyan/Blue gradient
   - Icon: Document icon
   - API: `GET /api/dashboard/stats`

2. **Pending Reviews**
   - Number: Count of studies with status PENDING_REVIEW assigned to user
   - Subtitle: "+X due this week"
   - Color: Orange gradient
   - Icon: Clock icon

3. **Approved Protocols**
   - Number: Total approved studies
   - Subtitle: "+X this quarter"
   - Color: Green gradient
   - Icon: Checkmark icon

4. **Total Participants**
   - Number: Sum of all enrolled participants
   - Subtitle: "+X this month"
   - Color: Magenta/Pink gradient
   - Icon: People icon

**Sections:**

1. **Recent Activity Feed**
   - Timeline view (left border accent color)
   - Shows last 10 actions:
     - Protocol approved
     - Review required
     - Participant enrolled
     - Document uploaded
   - Each item:
     - Icon (colored circle)
     - Title (bold)
     - Description (secondary text)
     - Timestamp (relative: "2 hours ago")
   - "View All" link → `/audit-logs`

2. **Upcoming Deadlines**
   - List of IRB review deadlines
   - Each item:
     - Protocol ID (small text)
     - Deadline title
     - Date
     - Days remaining (emphasized)
     - Priority indicator (colored dot)
   - Sorted by urgency

3. **Quick Actions** (for PIs)
   - Buttons:
     - "New Study Protocol" → `/studies/new`
     - "Enroll Participant" → `/participants/enroll`
     - "Upload Document" → `/documents/upload`

#### Coordinator Dashboard (`/dashboard/coordinator`)

**Different Layout:**
- Assigned Studies list
- Pending enrollments
- Document upload queue
- Visit schedules

---

### 4.3 Studies List (`/studies`)

**Purpose:** Browse and manage research studies

**Header:**
- Page title: "Studies"
- Search bar (placeholder: "Search by title, protocol number...")
- "New Study" button (primary, right aligned)
  - **Permission:** Only visible to PIs, Admins
  - **Action:** Navigate to `/studies/new`

**Filters (Chip UI):**
- Status: All, Draft, Pending Review, Approved, Active, Suspended, Closed
- Type: All, Interventional, Observational, Registry, Survey, Other
- "Clear Filters" button

**Display Mode Toggle:**
- Grid view (default)
- List view (table format)

**Grid View - Study Card:**
- Header:
  - Protocol Number (small, gray)
  - Status Badge (colored pill)
- Title (bold, clickable → `/studies/[id]`)
- PI Name (secondary text with icon)
- Metadata row:
  - Start Date (calendar icon)
  - Participants: X / Y (target)
  - Last Updated (relative time)
- Footer actions:
  - "View" button
  - "..." menu (Edit, Delete, Export)

**List View - Table Columns:**
1. Protocol Number (sortable)
2. Title (sortable, clickable)
3. Principal Investigator
4. Status (badge)
5. Type
6. Participants (progress bar + count)
7. Last Updated (sortable)
8. Actions (dropdown menu)

**Empty State:**
- Icon (large document icon)
- Heading: "No studies found"
- Description: "Get started by creating your first research study"
- "New Study" button (if user has permission)

**API:** `GET /api/studies?status=X&type=Y&search=Z`

---

### 4.4 Study Detail (`/studies/[id]`)

**Purpose:** View and manage a single study's details

**Header:**
- Protocol Number + Title (large)
- Status Badge (prominent)
- Action buttons (right side):
  - "Edit Study" (pencil icon) - **Permission:** PI or Admin only
  - "Export Data" (download icon)
  - "..." menu:
    - Submit for Review (if DRAFT)
    - Approve/Reject (if PENDING_REVIEW and user is Reviewer)
    - Close Study
    - Delete Study (Admin only)

**Tab Navigation:**
1. Overview (default)
2. Documents
3. Participants
4. Coordinators
5. History (audit trail)

#### Tab 1: Overview

**Study Information Card:**
- Principal Investigator (name, email)
- Reviewer (if assigned)
- Study Type
- Risk Level
- Description (expandable)
- Start Date / End Date
- IRB Approval Date
- IRB Expiration Date

**Enrollment Card:**
- Current Enrollment: X / Y (target)
- Progress bar (visual)
- Enrollment Rate graph (future)
- "Enroll Participant" button

**Timeline:**
- Created date
- Submitted for review date
- Approved date
- Key milestones

#### Tab 2: Documents

**Document Upload Section:**
- Drag-and-drop zone
  - "Drop files here or click to browse"
  - Accepted types: PDF, JPG, PNG, DOCX
  - Max size: 10MB
- File type selector dropdown:
  - Protocol
  - Consent Form
  - Amendment
  - Approval Letter
  - Adverse Event Report
  - Progress Report
  - Other
- Upload button (disabled until file selected)

**Document List:**
- Table view:
  1. Name (clickable → preview)
  2. Type (badge)
  3. Version
  4. Uploaded By (user name)
  5. Upload Date
  6. Status (OCR status + Aigents status)
  7. Actions:
     - View/Download
     - View OCR Content (if available)
     - Run AI Analysis (if not already done)
     - Delete

**OCR Status Indicators:**
- Not Supported (file type doesn't support OCR)
- Pending (queued)
- Processing (spinner)
- Completed (green checkmark, clickable to view)
- Failed (red X, error message on hover)

**Aigents Analysis Status:**
- Not Started (button: "Analyze Document")
- Processing (spinner + "Analyzing...")
- Completed (green checkmark + "View Analysis" button)
- Failed (red X, retry button)

**Modals:**

1. **OCR Content Modal**
   - Title: Document name
   - Tabs:
     - Extracted Text (plain text, scrollable)
     - Original Document (PDF viewer)
   - "Close" button

2. **AI Analysis Modal**
   - Title: "AI Analysis - [Document Name]"
   - Sections:
     - Summary
     - Key Findings
     - Compliance Checklist
     - Recommendations
   - "Copy to Clipboard" button
   - "Close" button

3. **Confirm Analysis Modal**
   - Warning: "This will use AI credits"
   - "Cancel" / "Confirm" buttons

4. **Delete Document Confirmation**
   - Warning: "Are you sure? This cannot be undone."
   - "Cancel" / "Delete" buttons (red)

#### Tab 3: Participants

**Header:**
- Enrollment count badge
- "Enroll Participant" button
- "Export Participants" button (CSV)
- Search bar

**Participant Table:**
1. Subject ID (IRB identifier)
2. Participant ID (internal)
3. Group Assignment (Treatment/Control badge)
4. Enrollment Date
5. Status (badge: Screening, Enrolled, Active, Completed, Withdrawn)
6. Actions:
   - View Details → `/studies/[id]/participants/[participantId]`
   - Schedule Visit
   - Mark Status
   - Remove (Admin only)

**Enroll Participant Modal:**
- Form fields:
  - Subject ID (required, auto-generated or manual)
  - First Name (optional, depends on protocol)
  - Last Name (optional)
  - Date of Birth (date picker)
  - Email (optional)
  - Phone (optional)
  - Consent Date (required, date picker)
  - Consent Version (dropdown)
  - Group Assignment (dropdown: Treatment, Control, Placebo)
  - Notes (textarea)
- Upload consent form (optional)
- "Cancel" / "Enroll" buttons

#### Tab 4: Coordinators

**Assigned Coordinators List:**
- Table:
  1. Name
  2. Email
  3. Assigned Date
  4. Assigned By
  5. Status (Active/Inactive toggle)
  6. Actions: Remove

**Add Coordinator Section:**
- Search dropdown:
  - Type to filter coordinators
  - Shows: Name, Email, Role badge
- "Add" button

#### Tab 5: History

**Audit Log Table:**
- Filters: Action type, Date range, User
- Columns:
  1. Timestamp (sortable)
  2. User (name + email)
  3. Action (CREATE, UPDATE, DELETE, APPROVE, etc.)
  4. Changes (expandable details)
  5. IP Address (Admin only)

---

### 4.5 Create New Study (`/studies/new`)

**Purpose:** Multi-step wizard to create a research study

**Progress Indicator:**
- Steps:
  1. Basic Information
  2. Study Details
  3. Documents
  4. Review & Submit

**Step 1: Basic Information**

- Protocol Number (auto-generated or manual input)
- Study Title (required)
- Principal Investigator (dropdown, searchable)
- Study Type (dropdown: Interventional, Observational, Registry, Survey, Other)
- Risk Level (dropdown: Minimal, Moderate, High)

**Step 2: Study Details**

- Description (rich text editor)
- Start Date (date picker)
- End Date (date picker)
- Target Enrollment (number input)
- Research Objectives (textarea)
- Inclusion Criteria (textarea)
- Exclusion Criteria (textarea)

**Step 3: Documents**

- Upload protocol document (drag-drop or browse)
- Upload consent form (drag-drop or browse)
- Upload any additional documents

**Step 4: Review & Submit**

- Summary of all entered data
- "Save as Draft" button
- "Submit for Review" button (changes status to PENDING_REVIEW)

**Navigation:**
- "Back" / "Next" buttons
- Steps are clickable to jump (with validation)
- Auto-save on each step (optional)

---

### 4.6 Participants Page (`/participants`)

**Purpose:** View all participants across all studies

**Filters:**
- Study (dropdown)
- Status (dropdown)
- Date Range (date picker)

**Table Columns:**
1. Subject ID
2. Study (title + protocol number)
3. Group Assignment
4. Enrollment Date
5. Status
6. Last Visit
7. Actions (View, Edit, Export)

**Export Button:**
- Exports filtered participants to CSV
- API: `GET /api/studies/[id]/participants/export`

---

### 4.7 Documents Page (`/documents`)

**Purpose:** View all uploaded documents across all studies

**Filters:**
- Study (dropdown)
- Document Type (dropdown)
- OCR Status (dropdown)
- Upload Date Range

**Table Columns:**
1. Name
2. Study
3. Type
4. Version
5. Uploaded By
6. Upload Date
7. OCR Status
8. Aigents Status
9. Actions (View, Download, Analyze, Delete)

---

### 4.8 Users Management (`/users`)

**Purpose:** Manage system users (Admin only)

**Header:**
- "Add User" button

**Filters:**
- Role (dropdown)
- Status (Active/Inactive)
- Approval Status (Approved/Pending)

**Table Columns:**
1. Name
2. Email
3. Role (badge)
4. Status (Active/Inactive toggle)
5. Approved (Yes/No)
6. Created Date
7. Actions:
   - Edit → `/users/[id]`
   - Approve/Reject (if pending)
   - Deactivate/Activate
   - Delete

**Add/Edit User Modal:**
- First Name (required)
- Last Name (required)
- Email (required, unique)
- Password (required on create, optional on edit)
- Role (dropdown: Admin, Reviewer, Researcher, Coordinator)
- Approved (checkbox, Admin only)
- Active (checkbox)

---

### 4.9 Audit Logs (`/audit-logs`)

**Purpose:** Complete compliance audit trail

**Filters:**
- Date Range (date picker)
- Action Type (dropdown: CREATE, UPDATE, DELETE, APPROVE, etc.)
- Entity Type (dropdown: Study, Participant, Document, User)
- User (searchable dropdown)

**Table Columns:**
1. Timestamp (sortable)
2. User (name + email)
3. Action (badge)
4. Entity Type
5. Entity Name
6. Details (expandable)
7. IP Address
8. User Agent (expandable)

**Expandable Details:**
- Old Values (JSON formatted)
- New Values (JSON formatted)
- Changes (diff view)

**Export:**
- "Export to CSV" button
- Date range required

---

## 5. Data Models & Relationships

### Study
- **Has Many:** Participants, Documents, Enrollments, Coordinators
- **Belongs To:** Principal Investigator (User), Reviewer (User)
- **Statuses:** DRAFT, PENDING_REVIEW, APPROVED, ACTIVE, SUSPENDED, CLOSED, COMPLETED

### Participant
- **Belongs To:** Study
- **Has Many:** Enrollments, Visits
- **Statuses:** SCREENING, ENROLLED, ACTIVE, COMPLETED, WITHDRAWN, LOST_TO_FOLLOWUP

### Document
- **Belongs To:** Study, Uploaded By (User)
- **Has Many:** Automation Logs
- **Types:** PROTOCOL, CONSENT_FORM, AMENDMENT, APPROVAL_LETTER, ADVERSE_EVENT, PROGRESS_REPORT, OTHER
- **OCR Statuses:** pending, processing, completed, failed, not_supported
- **Aigents Statuses:** pending, processing, completed, failed

### User
- **Belongs To:** Role
- **Has Many:** Studies (as PI), Studies (as Reviewer), Study Coordinators, Enrollments, Documents

### Enrollment
- **Links:** Study ↔ Participant
- **Tracks:** Enrollment date, status, withdrawal info

### Audit Log
- **Belongs To:** User
- **Tracks:** All system actions for compliance

---

## 6. API Endpoints

### Authentication
- `POST /api/auth` - Login
  - Input: `{ email, password }`
  - Output: `{ token, user }`

### Dashboard
- `GET /api/dashboard/stats` - Get dashboard statistics
  - Output: `{ totalStudies, activeStudies, pendingReviews, totalParticipants }`

### Studies
- `GET /api/studies` - List studies (with filters)
  - Query: `?status=X&type=Y&search=Z`
  - Output: Array of study objects

- `POST /api/studies` - Create new study
  - Input: Study object
  - Output: Created study

- `GET /api/studies/[id]` - Get study details
  - Output: Full study object with relations

- `PUT /api/studies/[id]` - Update study
  - Input: Partial study object
  - Output: Updated study

- `DELETE /api/studies/[id]` - Delete study

- `POST /api/studies/[id]/review` - Submit review decision
  - Input: `{ decision: 'approve' | 'reject', comments }`

- `GET /api/studies/export` - Export all studies to CSV

### Documents
- `GET /api/studies/[id]/documents` - List study documents

- `POST /api/studies/[id]/documents` - Upload document
  - Input: FormData with file
  - Output: Document object

- `GET /api/documents/[id]/ocr` - Get OCR content
  - Output: `{ ocrContent, status }`

- `POST /api/documents/[id]/aigents` - Trigger AI analysis
  - Output: `{ chainRunId, status }`

- `DELETE /api/documents/[id]` - Delete document

### Participants
- `GET /api/studies/[id]/participants` - List study participants

- `POST /api/studies/[id]/participants` - Enroll participant
  - Input: Participant object
  - Output: Created participant + enrollment

- `GET /api/studies/[id]/participants/export` - Export participants CSV

### Coordinators
- `GET /api/studies/[id]/coordinators` - List assigned coordinators

- `POST /api/studies/[id]/coordinators` - Assign coordinator
  - Input: `{ coordinatorId }`
  - Output: StudyCoordinator object

- `DELETE /api/studies/[id]/coordinators/[coordinatorId]` - Remove coordinator

### Users
- `GET /api/users` - List users (Admin only)

- `POST /api/users` - Create user
  - Input: User object
  - Output: Created user

- `PUT /api/users/[id]` - Update user

- `DELETE /api/users/[id]` - Delete user

### Audit Logs
- `GET /api/audit-logs` - List audit logs
  - Query: `?action=X&entity=Y&startDate=Z&endDate=W`
  - Output: Array of audit log entries

### Webhooks
- `POST /api/webhooks/aigents` - Receive Aigents analysis results
  - Input: `{ chain_run_id, agent_response }`
  - Action: Updates document with analysis

---

## 7. Interactive Components

### Buttons

**Primary Button:**
- Background: Cyan gradient (#06ABEB → #0891C7)
- Text: White, 16px, Semi-bold
- Height: 44px
- Border radius: 8px
- Shadow: Light cyan glow
- Hover: Slight lift, darker gradient
- Active: Scale 0.98
- Disabled: Gray, opacity 50%, no hover

**Secondary Button:**
- Background: Transparent
- Border: 2px solid cyan
- Text: Cyan
- Hover: Background cyan 10% opacity

**Danger Button:**
- Background: Red gradient
- Used for delete, reject actions

### Status Badges

**Pill-shaped badges** (4px vertical padding, 12px horizontal, full border radius):

- **DRAFT:** Gray background, dark gray text
- **PENDING_REVIEW:** Amber background, amber-800 text
- **APPROVED:** Green background, green-800 text
- **ACTIVE:** Blue background, blue-800 text
- **SUSPENDED:** Orange background, orange-800 text
- **CLOSED:** Dark gray background, white text
- **COMPLETED:** Green background, green-800 text
- **WITHDRAWN:** Red background, red-800 text

### Modals

**Structure:**
- Overlay: Semi-transparent black (60% opacity)
- Modal box: White, centered, drop shadow
- Border radius: 12px
- Max width: 600px (small), 900px (large)
- Close button: X icon in top right corner

**Sizes:**
- Small: Confirmations, simple forms
- Medium: Forms with 5-10 fields
- Large: Document viewers, detailed content
- Full-screen: Mobile only

### Forms

**Input Fields:**
- Height: 44px
- Padding: 10px 16px
- Border: 1px solid gray-300
- Border radius: 8px
- Focus: 2px cyan border, light shadow
- Error: Red border, error text below
- Success: Green border

**Dropdowns:**
- Same styling as inputs
- Chevron down icon on right
- Options list: white background, shadow
- Hover: Gray-50 background

**Date Pickers:**
- Native browser picker preferred
- Calendar icon on right
- Format: MM/DD/YYYY

**File Upload:**
- Drag-drop zone: Dashed border, large area
- Hover: Solid cyan border, light cyan background
- Icon: Upload cloud icon
- Text: "Drop files here or click to browse"
- File preview: Card with thumbnail, name, size, remove button

### Tables

**Header:**
- Background: Gray-50
- Text: 12px, uppercase, semi-bold, gray-600
- Sortable columns: Arrow icon
- Sticky on scroll

**Rows:**
- Height: 56px
- Border-bottom: 1px gray-200
- Hover: Gray-50 background
- Selected: Light cyan background

**Cells:**
- Text: 14px, gray-900
- Padding: 12px 16px
- Vertical align: middle

**Pagination:**
- Bottom of table
- Previous/Next buttons
- Page numbers (max 5 visible)
- Items per page dropdown

### Navigation

**Top Nav Bar:**
- Height: 64px
- Background: White
- Border-bottom: 1px gray-200
- Left: Logo + system name
- Center: Search bar (if applicable)
- Right: Notifications + User menu

**Sidebar:**
- Width: 280px (expanded), 64px (collapsed)
- Background: White or Gray-50
- Border-right: 1px gray-200
- Nav items:
  - Height: 44px
  - Icon + label
  - Active: Navy background, white text
  - Hover: Gray-100 background

---

## 8. States & Status Indicators

### Loading States

**Spinner:**
- Circular spinner, cyan color
- Size: 20px (inline), 40px (page level)
- Location: Center of container or inline with text

**Skeleton Loaders:**
- Use for tables, cards while data loads
- Gray-200 background, animated shimmer

**Progress Bars:**
- For file uploads, multi-step processes
- Cyan fill, gray-200 background
- Show percentage if available

### Empty States

**Components:**
- Large icon (gray-400)
- Heading (gray-900)
- Description (gray-600)
- Call-to-action button (if applicable)

**Examples:**
- "No studies found" → "Create New Study" button
- "No documents uploaded" → "Upload Document" button
- "No participants enrolled" → "Enroll Participant" button

### Error States

**Inline Errors:**
- Red text below field
- Red border on input
- Icon: Exclamation circle

**Alert Banners:**
- Top of page or section
- Red background, white text
- Dismissible (X button)
- Icon: Warning triangle

**Error Pages:**
- 404: "Page not found"
- 403: "Access denied"
- 500: "Server error"
- Each with illustration + back to home button

### Success States

**Toast Notifications:**
- Green background, white text
- Bottom-right corner
- Auto-dismiss after 3 seconds
- Icon: Checkmark

**Inline Success:**
- Green checkmark icon
- Green text (e.g., "Saved successfully")

---

## 9. Special Features

### OCR (Optical Character Recognition)

**What it does:**
- Automatically extracts text from uploaded PDF/image documents
- Uses Mistral AI vision model
- Runs asynchronously after document upload

**User Experience:**
1. User uploads document
2. System detects file type
3. If supported → OCR status badge appears: "Processing..."
4. User can continue with other tasks (non-blocking)
5. When complete → Status changes to "Completed" (green)
6. User clicks "View OCR Content" → Modal with extracted text
7. If failed → Status shows "Failed" with error tooltip

**Design Notes:**
- Status indicator must be visible on document list
- Don't block user interaction while OCR processes
- Provide clear indication of progress
- Show error messages if OCR fails

### AI Document Analysis (Aigents)

**What it does:**
- AI agent analyzes protocol documents
- Generates summary, compliance checklist, recommendations
- Runs asynchronously via webhook

**User Experience:**
1. User clicks "Analyze Document" button on document row
2. Confirmation modal: "This will use AI credits. Continue?"
3. User confirms
4. Status badge appears: "Analyzing..." (spinner)
5. System sends document to Aigents API
6. User can close page, analysis continues in background
7. When webhook received → Status changes to "Completed"
8. User clicks "View Analysis" → Modal with results
9. User can copy analysis to clipboard

**Design Notes:**
- Make it clear this is an optional, manual trigger (not automatic)
- Show cost/credit warning before starting
- Allow user to leave page while analysis runs
- Provide notification when analysis completes (future)
- Make analysis results easy to read and copy

### Document Versioning

**What it does:**
- Tracks multiple versions of same document
- Links versions together
- Only latest version shown by default

**User Experience:**
1. User uploads new version of existing document
2. System prompts: "This looks like a new version. Link to previous?"
3. If linked → Version number increments
4. Document list shows: "Version 2" badge
5. Click version badge → Dropdown to view all versions
6. Each version:
   - Version number
   - Upload date
   - Uploaded by
   - Notes about changes
   - "View" button

**Design Notes:**
- Make version indicator subtle but discoverable
- Allow comparing versions (future)
- Clearly show which is latest/active version

### Real-time Status Updates

**What it does:**
- Uses polling to update document statuses
- Shows live progress of OCR and AI analysis

**User Experience:**
1. Document status badges update automatically
2. No page refresh required
3. Smooth transition animations
4. User sees: "Processing..." → "Completed" change in real-time

**Design Notes:**
- Update every 5-10 seconds (avoid excessive requests)
- Smooth fade transitions between statuses
- Consider WebSocket for real-time (future enhancement)

### Audit Trail

**What it does:**
- Logs every action in the system
- Immutable, timestamped records
- Required for regulatory compliance (21 CFR Part 11)

**User Experience:**
- Every page has subtle "History" or "Audit" tab
- Shows: Who did what, when, and what changed
- Filterable by date, user, action type
- Exportable for compliance reports

**Design Notes:**
- Don't make audit logging obtrusive
- Show in chronological order (newest first)
- Use timeline visualization where appropriate
- Highlight critical actions (approval, deletion)

---

## 10. Design Constraints & Requirements

### Regulatory Compliance

**21 CFR Part 11 (FDA Electronic Records):**
- ✅ Audit trails for all actions
- ✅ User authentication
- ✅ Data integrity (no silent failures)
- ✅ Role-based access control
- ✅ Timestamped records

**HIPAA (if handling PHI):**
- ⚠️ Participant data may include PHI
- Design must accommodate:
  - Data encryption (visual indicators)
  - Access logs
  - Secure document handling

**Design Implication:**
- Every destructive action must confirm
- Every change must be logged
- Show audit metadata where appropriate

### Accessibility (WCAG 2.1 AA Minimum)

**Required:**
- ✅ Color contrast: 4.5:1 for text, 3:1 for UI components
- ✅ Keyboard navigation for all interactive elements
- ✅ Focus indicators (2px cyan outline)
- ✅ Screen reader support (semantic HTML, ARIA labels)
- ✅ Minimum touch target: 44x44px
- ✅ Form labels properly associated
- ✅ Descriptive link text (no "click here")

**Design Implication:**
- Don't use color as only indicator
- Provide text alternatives for icons
- Ensure sufficient contrast
- Design for keyboard-only users

### Performance

**Target Metrics:**
- Page load: < 2 seconds
- Time to Interactive: < 3 seconds
- API response: < 500ms (95th percentile)

**Design Implication:**
- Use skeleton loaders for perceived speed
- Paginate long lists (50 items per page)
- Lazy load images and heavy components
- Optimize images (use next/image)

### Responsive Design

**Breakpoints:**
- Mobile: 320px - 640px
- Tablet: 641px - 1024px
- Desktop: 1025px+

**Mobile-Specific:**
- Sidebar collapses to hamburger menu
- Tables convert to stacked cards
- Bottom tab navigation (mobile)
- Touch-friendly targets (min 44px)
- Swipe gestures where appropriate

**Design Implication:**
- Design mobile-first
- Test on actual devices
- Consider thumb zones for important actions
- Full-screen modals on mobile

### Browser Support

**Required:**
- Chrome 90+ (primary)
- Firefox 88+
- Safari 14+
- Edge 90+

**Not Supporting:**
- Internet Explorer (any version)

### Data Privacy

**Principles:**
- Show only necessary data
- Redact sensitive info where appropriate
- Clear visual indication of sensitive fields
- Secure document handling (no preview of SSN, DOB unless necessary)

**Design Implication:**
- Use masked fields for sensitive data
- Add "eye" icon to reveal/hide
- Show lock icons for encrypted data
- Warn before displaying PHI

---

## 📝 Appendix: User Stories

### For Principal Investigators (PIs)

1. "As a PI, I want to create a new study protocol in under 10 minutes, so I can focus on research instead of paperwork."

2. "As a PI, I want to see the status of my submitted protocols at a glance, so I know when I need to respond to reviewer feedback."

3. "As a PI, I want to upload multiple documents at once and have the system automatically extract text, so I don't have to manually enter protocol details."

4. "As a PI, I want to assign coordinators to my study, so they can help with enrollment and data collection."

5. "As a PI, I want to track participant enrollment progress against my target, so I know if recruitment is on track."

### For IRB Reviewers

6. "As a reviewer, I want to see a summary of each protocol before reading the full document, so I can prioritize my review queue."

7. "As a reviewer, I want the system to flag potential compliance issues using AI, so I can focus my attention on critical areas."

8. "As a reviewer, I want to provide structured feedback that the PI can easily address, so revisions are completed faster."

9. "As a reviewer, I want to see the full audit trail of a study, so I can verify compliance with IRB procedures."

### For Coordinators

10. "As a coordinator, I want to enroll participants quickly with minimal data entry, so I can focus on patient care."

11. "As a coordinator, I want to upload consent forms and have them automatically linked to participants, so I don't lose track of paperwork."

12. "As a coordinator, I want to see my assigned studies in one place, so I don't have to search through the entire system."

13. "As a coordinator, I want to schedule participant visits and track attendance, so I can manage study timelines."

### For Administrators

14. "As an admin, I want to assign reviewers to protocols based on expertise and workload, so reviews are completed efficiently."

15. "As an admin, I want to generate compliance reports for regulatory audits, so I can demonstrate our IRB process meets standards."

16. "As an admin, I want to manage user access and permissions, so only authorized people can view sensitive data."

17. "As an admin, I want to see system-wide statistics on study approvals and timelines, so I can identify bottlenecks."

---

## 🎯 Design Deliverables Checklist

When designing in Figma, please include:

### Pages (Desktop)
- [ ] Login page
- [ ] Dashboard (Admin/Reviewer view)
- [ ] Dashboard (Coordinator view)
- [ ] Studies list (grid view)
- [ ] Studies list (table view)
- [ ] Study detail (all 5 tabs)
- [ ] Create new study (all 4 steps)
- [ ] Participants page
- [ ] Documents page
- [ ] Users management page
- [ ] Audit logs page

### Mobile Views
- [ ] Login
- [ ] Dashboard
- [ ] Studies list (cards)
- [ ] Study detail (responsive tabs)
- [ ] Document upload (camera capture)

### Components Library
- [ ] Buttons (all variants + states)
- [ ] Form inputs (all types + states)
- [ ] Status badges (all statuses)
- [ ] Cards (study, stat, document)
- [ ] Tables (with all states)
- [ ] Modals (all sizes)
- [ ] Navigation (top nav, sidebar, mobile nav)
- [ ] Empty states
- [ ] Loading states
- [ ] Error states

### Interactions
- [ ] Button hover/active states
- [ ] Modal open/close animations
- [ ] Dropdown expand/collapse
- [ ] Tab switching
- [ ] Form validation states
- [ ] Toast notifications appear/dismiss

### Design Tokens/Styles
- [ ] Color palette (exported as variables)
- [ ] Typography scale (exported as text styles)
- [ ] Spacing system
- [ ] Shadow styles
- [ ] Border radius values

---

## 📞 Questions to Clarify Before Designing

1. **Should we show participant names, or only Subject IDs for privacy?**
   - Default to Subject IDs only, names optional (configurable per study)

2. **How should we handle studies with 100+ documents?**
   - Pagination (20 per page), grouping by type, advanced filters

3. **Mobile app or mobile-responsive web?**
   - Mobile-responsive web for now, native app in future

4. **Dark mode?**
   - Not required for V1, but design system should support future addition

5. **Notification system?**
   - Email notifications (backend)
   - In-app notifications (future feature - design the bell icon/dropdown)

6. **Calendar/scheduling features?**
   - Future feature, but design participant visit scheduling in advance

7. **Multi-language support?**
   - Not required for V1 (English only)

---

## 🚀 Implementation Priorities

**Phase 1 (MVP):**
- Login, Dashboard, Studies (list + detail), Documents, Basic participant enrollment

**Phase 2:**
- Full participant management, Visit scheduling, Advanced filters, Export features

**Phase 3:**
- Mobile optimization, Notifications, Reporting dashboard, Advanced AI features

---

**End of Functional Specification**

**For Questions:** Contact development team at `C:\Users\jeffr\IRB try 2`

**Related Documents:**
- `FIGMA_DESIGN_BRIEF.md` - Visual design guidelines
- `design-tokens.json` - Design system tokens
- `FIGMA_TO_CODE_WORKFLOW.md` - How to hand off designs

---

*This document should give Figma AI or any designer everything they need to create accurate, functional UX designs that match the actual system capabilities.*
