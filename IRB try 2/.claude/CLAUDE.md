# IRB Management System - Claude Code Context

**Last Updated:** 2025-01-23
**Current Branch:** AI-branch
**Project Status:** Implementing AI-Powered Protocol Analysis Features

---

## Project Overview

This is an **IRB (Institutional Review Board) Management System** for Mount Sinai Health System. It handles clinical research study protocols, participant enrollment, document management, compliance tracking, and IRB review workflows.

**Tech Stack:**
- **Frontend:** Next.js 14 (App Router), React, TypeScript, Tailwind CSS
- **Backend:** Next.js API Routes, Prisma ORM
- **Database:** SQLite (dev), PostgreSQL (production)
- **State Management:** Zustand
- **Auth:** JWT tokens (currently localStorage - security concern noted)
- **AI/ML:** Mistral AI OCR (existing), OpenAI GPT-4o (planned), Claude 3.5 Sonnet (planned)
- **Vector Search:** text-embedding-3-large + PostgreSQL pgvector (planned)
- **Job Queue:** BullMQ + Redis (planned)

---

## Current Development Phase

### AI-Branch Implementation (Active)

**Goal:** Implement AI-powered clinical trial protocol analysis features

**PRD Source:** User-provided comprehensive PRD for AI features

**Implementation Phases:**

#### Phase 1: Foundation (Months 1-3) - CURRENT PHASE
**Priority:** P0 (Critical Path)

**Features to Implement:**
1. **AI Protocol Analysis Engine**
   - File: `app/api/ai/analyze-protocol/route.ts`
   - OpenAI GPT-4o integration
   - Claude 3.5 Sonnet fallback
   - Async job processing with BullMQ
   - Study metadata extraction
   - Executive summary generation
   - Complexity scoring
   - Compliance assessment

2. **Inclusion/Exclusion Criteria Extraction**
   - File: `app/api/ai/criteria/route.ts`
   - Natural language criteria parsing
   - Structured criterion storage
   - Categorization (age, medical, medication, etc.)
   - Logic operator handling (AND, OR, NOT)

3. **Visit Schedule Generator**
   - File: `app/api/ai/visit-schedule/route.ts`
   - Protocol timeline extraction
   - Visit/procedure mapping
   - Calendar integration
   - Timeline visualization

4. **AI Analysis Dashboard UI**
   - File: `app/studies/[id]/components/AiAnalysisDashboard.tsx`
   - Analysis results display
   - Criteria review interface
   - Visit schedule calendar
   - Compliance indicators
   - User feedback collection

5. **Database Schema Migrations**
   - File: `prisma/migrations/*/migration.sql`
   - New models: AiAnalysis, Criterion, VisitSchedule, BudgetEstimate, ComplianceCheck, ProtocolSimilarity, UserFeedback
   - Relationships with existing Study model

#### Phase 2: Enhanced Analysis (Months 4-6)
**Priority:** P1 (High)
- Budget estimation
- Risk assessment
- Compliance checker (FDA 21 CFR Part 11, ICH-GCP)

#### Phase 3: Comparative Intelligence (Months 7-9)
**Priority:** P2 (Medium)
- Protocol similarity search
- Historical data analysis
- Best practices recommendations

#### Phase 4: Advanced Features (Months 10-12)
**Priority:** P3 (Nice to Have)
- Multi-language support
- Real-time collaboration
- Version control for protocols

---

## Design Workflow Established

**Documentation Created:**
1. **`docs/design/FIGMA_TO_CODE_WORKFLOW.md`**
   - Screenshot-based design handoff workflow
   - How to export from Figma and share with Claude Code
   - Templates and best practices

2. **`docs/design/FUNCTIONAL_SPECIFICATION_FOR_FIGMA.md`**
   - Comprehensive 1,351-line specification
   - System overview, user roles, workflows
   - Page-by-page specifications
   - Data models, API endpoints, components
   - Design constraints and Mount Sinai branding

**Design System:**
- Mount Sinai brand colors already implemented in `tailwind.config.js`
- Primary: #06ABEB (Vivid Cerulean)
- Accent: #DC298D (Barbie Pink)
- Heading: #212070 (St. Patrick's Blue)
- Navy: #00002D (Cetacean Blue)

**Workflow:** Design in Figma → Export screenshot → Share with Claude → Implement → Iterate

---

## Code Patterns & Conventions

### Commit Messages
Uses **Conventional Commits** format:
- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `refactor:` - Code refactoring
- `test:` - Test additions/changes
- `chore:` - Build/tooling changes

**AI Co-Authorship Footer:**
```
🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

### File Structure
```
app/
├── api/
│   ├── ai/              # AI feature endpoints (NEW)
│   ├── studies/         # Study CRUD operations
│   ├── documents/       # Document management
│   └── webhooks/        # External integrations (Aigents)
├── dashboard/           # Main dashboard
├── studies/             # Study management UI
│   └── [id]/
│       └── components/  # Study detail components
├── documents/           # Document upload/view
└── participants/        # Participant management

prisma/
├── schema.prisma        # Database schema
└── migrations/          # Database migrations

docs/
├── design/              # Design documentation
└── architecture/        # ADRs, technical docs
```

### API Route Pattern
```typescript
// app/api/ai/analyze-protocol/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Extract body
    const { studyId } = await request.json();

    // Process
    const result = await analyzeProtocol(studyId);

    // Return
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### Component Pattern (Client Components)
```typescript
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/state';

export default function ComponentName() {
  const router = useRouter();
  const { token, user } = useAuthStore();
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }
    fetchData();
  }, [token]);

  // Component logic...
}
```

### Prisma Schema Pattern
```prisma
model ModelName {
  id          String   @id @default(cuid())
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Fields...

  // Relations...

  @@index([fieldName])
}
```

---

## Existing Features

### Core Functionality
- ✅ User authentication & role-based access control (Admin, Reviewer, Principal Investigator, Coordinator)
- ✅ Study protocol management (CRUD operations)
- ✅ Document upload & management
- ✅ Participant enrollment & tracking
- ✅ IRB review workflows
- ✅ Audit logging
- ✅ Dashboard with stats and quick actions

### Integrations
- ✅ **Mistral AI OCR** - Document text extraction
  - Status tracking in Document model (ocrStatus, ocrContent)
  - Webhook processing for OCR results

- ✅ **Aigents Integration** - Research automation
  - Fields: aigentsChainName, aigentsRunId, aigentsStatus, aigentsAnalysis
  - Webhook endpoint: `app/api/webhooks/aigents/route.ts`

### UI Components (Design System)
Located in `components/ui/`:
- StatCard - Dashboard statistics with gradients
- Button - Primary, secondary, outline variants
- StatusBadge - Study status indicators
- Forms - Input, Select, Textarea with validation

---

## Database Schema (Existing)

### Key Models

**User**
```prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  firstName     String
  lastName      String
  passwordHash  String
  role          Role      @relation(fields: [roleId], references: [id])
  roleId        String
  studies       Study[]
  auditLogs     AuditLog[]
}
```

**Study**
```prisma
model Study {
  id                String      @id @default(cuid())
  protocolNumber    String      @unique
  title             String
  principalInvestigatorId String
  status            String      // draft, pending_review, approved, active, completed, suspended
  submissionDate    DateTime?
  approvalDate      DateTime?
  expirationDate    DateTime?

  // Relations
  principalInvestigator User        @relation(fields: [principalInvestigatorId], references: [id])
  documents         Document[]
  participants      Participant[]
  automationLogs    AutomationLog[]
}
```

**Document**
```prisma
model Document {
  id          String   @id @default(cuid())
  studyId     String
  fileName    String
  fileSize    Int
  uploadedBy  String

  // OCR fields
  ocrContent  String?
  ocrStatus   String?  // pending, processing, completed, failed

  // Aigents integration
  aigentsChainName String?
  aigentsRunId     String?
  aigentsStatus    String?
  aigentsAnalysis  String?

  study       Study    @relation(fields: [studyId], references: [id])
}
```

---

## Planned Database Changes (Phase 1)

### New AI Models

**AiAnalysis**
```prisma
model AiAnalysis {
  id                    String   @id @default(cuid())
  studyId               String   @unique
  status                String   // pending, processing, completed, failed
  model                 String   // gpt-4o, claude-3.5-sonnet

  // Results
  studyMetadata         Json?
  executiveSummary      String?
  complexityScore       Int?
  complianceScore       Int?
  riskLevel             String?
  processingTimeMs      Int?

  // Timestamps
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  // Relations
  study                 Study    @relation(fields: [studyId], references: [id])
  criteria              Criterion[]
  visitSchedule         VisitSchedule[]
  budgetEstimate        BudgetEstimate?
  complianceChecks      ComplianceCheck[]
  userFeedback          UserFeedback[]
}
```

**Criterion**
```prisma
model Criterion {
  id              String   @id @default(cuid())
  aiAnalysisId    String
  type            String   // inclusion, exclusion
  category        String   // age, medical_history, medication, etc.
  description     String
  originalText    String
  logicOperator   String?  // AND, OR, NOT
  priority        Int      @default(0)

  aiAnalysis      AiAnalysis @relation(fields: [aiAnalysisId], references: [id])

  @@index([aiAnalysisId])
}
```

**VisitSchedule**
```prisma
model VisitSchedule {
  id              String   @id @default(cuid())
  aiAnalysisId    String
  visitName       String
  visitNumber     Int
  dayRange        String   // "Day 0", "Week 1", "Month 3"
  procedures      Json     // Array of procedures
  duration        String?

  aiAnalysis      AiAnalysis @relation(fields: [aiAnalysisId], references: [id])

  @@index([aiAnalysisId])
}
```

---

## Security & Compliance Requirements

### HIPAA Compliance
- ✅ Audit logging implemented (AuditLog model)
- ⚠️ **TODO:** Move JWT tokens from localStorage to httpOnly cookies
- 🔄 **In Progress:** BAA with AI providers (OpenAI, Anthropic)
- 🔄 **In Progress:** Data encryption at rest and in transit
- 🔄 **In Progress:** Access controls and role-based permissions refinement

### FDA 21 CFR Part 11
- Electronic signatures
- Audit trails (partially implemented)
- Record retention
- System validation

### ICH-GCP E6(R2)
- Good Clinical Practice guidelines
- Protocol compliance tracking
- Informed consent management

---

## API Endpoints

### Existing
- `GET /api/dashboard/stats` - Dashboard statistics
- `GET /api/studies` - List studies
- `POST /api/studies` - Create study
- `GET /api/studies/[id]` - Study details
- `PUT /api/studies/[id]` - Update study
- `POST /api/documents/upload` - Upload document
- `POST /api/webhooks/aigents` - Aigents webhook

### Planned (Phase 1)
- `POST /api/ai/analyze-protocol` - Trigger AI analysis
- `GET /api/ai/analysis/[studyId]` - Get analysis results
- `POST /api/ai/criteria/extract` - Extract criteria
- `GET /api/ai/criteria/[studyId]` - Get extracted criteria
- `POST /api/ai/visit-schedule` - Generate visit schedule
- `GET /api/ai/visit-schedule/[studyId]` - Get visit schedule
- `POST /api/ai/feedback` - Submit user feedback

---

## Environment Variables

### Current
```env
DATABASE_URL="file:./dev.db"
NEXTAUTH_SECRET="..."
NEXTAUTH_URL="http://localhost:3000"
```

### Required for AI Features
```env
# OpenAI
OPENAI_API_KEY="sk-..."
OPENAI_ORG_ID="org-..."

# Anthropic (Fallback)
ANTHROPIC_API_KEY="sk-ant-..."

# Redis (BullMQ)
REDIS_URL="redis://localhost:6379"

# Vector Search
PGVECTOR_URL="postgresql://..."  # Production only
```

---

## Testing Strategy

### Current State
- ⚠️ No automated tests yet (tech debt)

### Planned for AI Features
1. **Unit Tests** (Vitest)
   - AI service functions
   - Data transformation utilities
   - Validation logic

2. **Integration Tests** (Playwright)
   - API endpoint testing
   - Database operations
   - AI provider integration

3. **E2E Tests** (Playwright)
   - Full protocol analysis workflow
   - UI interaction with AI features
   - Error handling scenarios

4. **AI Quality Tests**
   - Criteria extraction accuracy (target: 90%+)
   - Visit schedule correctness
   - Compliance check validation

---

## Performance Targets (AI Features)

**From PRD:**
- Protocol analysis: < 2 minutes
- Criteria extraction: 90%+ accuracy
- Visit schedule generation: < 30 seconds
- Budget estimation: < 1 minute
- System uptime: 99.9%
- API response time: < 500ms (non-AI endpoints)

**Monitoring:**
- Processing time tracking in AiAnalysis model
- User feedback collection
- Error rate monitoring
- Cost tracking (AI API usage)

---

## Known Issues & Tech Debt

1. **Security:** JWT tokens in localStorage (should use httpOnly cookies)
2. **Testing:** No automated test coverage
3. **State Management:** Zustand setup could be more robust
4. **Error Handling:** Need consistent error handling strategy
5. **Type Safety:** Some `any` types need refinement
6. **Documentation:** API documentation needed (consider OpenAPI/Swagger)

---

## Development Server

**Default Port:** 3000
**Start Command:** `npm run dev`
**Build Command:** `npm run build`
**Production Start:** `npm start`

**Database Commands:**
```bash
npx prisma generate      # Generate Prisma Client
npx prisma migrate dev   # Run migrations (dev)
npx prisma migrate deploy # Run migrations (prod)
npx prisma studio        # Database GUI
```

---

## Git Workflow

**Main Branch:** `main` (or `001-research-study-management`)
**Current Feature Branch:** `AI-branch`

**Recent Commits:**
```
9b2e301 fix: Resolve prop shadowing bug and simplify webhook endpoint
60270f4 feat: Add OCR status visibility and Aigents webhook endpoint
b0b2a4d feat: Complete UX improvements Phases 4-7
4857639 feat: Implement UX improvements for document upload, OCR, and AI analysis
702ce68 fix: Correct Aigents API field name
```

**Commit Pattern:**
```bash
git add .
git commit -m "feat: Add AI protocol analysis engine

- Implement OpenAI GPT-4o integration
- Add BullMQ job queue for async processing
- Create AiAnalysis Prisma model
- Add analysis status tracking

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
git push origin AI-branch
```

---

## Resources & Documentation

### Internal Docs
- `docs/design/FIGMA_TO_CODE_WORKFLOW.md` - Figma design workflow
- `docs/design/FUNCTIONAL_SPECIFICATION_FOR_FIGMA.md` - Complete system spec
- `docs/design/design-tokens.json` - Design system tokens
- `docs/architecture/` - ADRs and architecture decisions (if exists)

### External References
- [Next.js 14 Docs](https://nextjs.org/docs)
- [Prisma Docs](https://www.prisma.io/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [OpenAI API](https://platform.openai.com/docs)
- [Anthropic Claude API](https://docs.anthropic.com)
- [FDA 21 CFR Part 11](https://www.fda.gov/regulatory-information/search-fda-guidance-documents/part-11-electronic-records-electronic-signatures-scope-and-application)
- [ICH-GCP E6(R2)](https://www.ich.org/page/efficacy-guidelines)

---

## Quick Start for New Session

1. **Check current branch:** `git branch --show-current`
2. **Pull latest:** `git pull origin AI-branch`
3. **Check git status:** `git status`
4. **Start dev server:** `npm run dev`
5. **Review pending tasks:** Check GitHub issues
6. **Read PRD:** User-provided AI features PRD (in conversation history)

---

## Contact & Collaboration

**User:** Jeffrey (jeffr)
**Role:** Product Owner / Developer
**Preference:** Likes to review before implementation, iterative approach
**Feedback Pattern:** Direct and clear when changes needed

**Claude Code Usage Pattern:**
- Screenshot-based design sharing preferred
- Comprehensive documentation appreciated
- Autonomous implementation after approval
- Clear GitHub issue tracking

---

**Last Context Update:** 2025-01-23
**Next Review:** After Phase 1 completion
