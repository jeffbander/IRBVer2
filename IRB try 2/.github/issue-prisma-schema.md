# Database Schema Migration - AI Analysis Models

**Parent Issue:** #10
**Phase:** Phase 1 - Foundation
**Priority:** P0 (Critical Path)
**Estimated Time:** 2-3 days

---

## 📋 Description

Create Prisma schema migrations to add all AI-related database models needed for protocol analysis features.

---

## 🎯 Acceptance Criteria

- [ ] All 7 new models added to `prisma/schema.prisma`:
  - `AiAnalysis` - Main analysis results
  - `Criterion` - Inclusion/exclusion criteria
  - `VisitSchedule` - Protocol visit timeline
  - `BudgetEstimate` - Cost projections
  - `ComplianceCheck` - Regulatory compliance
  - `ProtocolSimilarity` - Similar protocol matches
  - `UserFeedback` - User feedback on AI results

- [ ] All relationships properly defined with existing models (Study, User)
- [ ] Appropriate indexes added for performance
- [ ] Migration runs successfully on SQLite (dev)
- [ ] Migration tested on PostgreSQL (production-ready)
- [ ] Prisma Client regenerated without errors
- [ ] No breaking changes to existing schema

---

## 🔧 Implementation Details

### New Models to Add

**1. AiAnalysis**
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
  errorMessage          String?

  // Timestamps
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  // Relations
  study                 Study    @relation(fields: [studyId], references: [id])
  criteria              Criterion[]
  visitSchedule         VisitSchedule[]
  budgetEstimate        BudgetEstimate?
  complianceChecks      ComplianceCheck[]
  similarities          ProtocolSimilarity[] @relation("SourceAnalysis")
  userFeedback          UserFeedback[]

  @@index([studyId])
  @@index([status])
  @@index([createdAt])
}
```

**2. Criterion**
```prisma
model Criterion {
  id              String   @id @default(cuid())
  aiAnalysisId    String
  type            String   // inclusion, exclusion
  category        String   // age, medical_history, medication, laboratory, etc.
  description     String   @db.Text
  originalText    String   @db.Text
  logicOperator   String?  // AND, OR, NOT
  priority        Int      @default(0)
  confidence      Float?   // AI confidence score (0.0-1.0)

  createdAt       DateTime @default(now())
  aiAnalysis      AiAnalysis @relation(fields: [aiAnalysisId], references: [id], onDelete: Cascade)

  @@index([aiAnalysisId])
  @@index([type])
  @@index([category])
}
```

**3. VisitSchedule**
```prisma
model VisitSchedule {
  id              String   @id @default(cuid())
  aiAnalysisId    String
  visitName       String
  visitNumber     Int
  dayRange        String   // "Day 0", "Week 1", "Month 3"
  procedures      Json     // Array of procedures/assessments
  duration        String?
  notes           String?  @db.Text

  createdAt       DateTime @default(now())
  aiAnalysis      AiAnalysis @relation(fields: [aiAnalysisId], references: [id], onDelete: Cascade)

  @@index([aiAnalysisId])
  @@index([visitNumber])
}
```

**4. BudgetEstimate**
```prisma
model BudgetEstimate {
  id                    String   @id @default(cuid())
  aiAnalysisId          String   @unique
  totalEstimate         Decimal  @db.Decimal(12, 2)
  perParticipantCost    Decimal  @db.Decimal(10, 2)
  breakdown             Json     // Cost breakdown by category
  assumptions           String?  @db.Text

  createdAt             DateTime @default(now())
  aiAnalysis            AiAnalysis @relation(fields: [aiAnalysisId], references: [id], onDelete: Cascade)

  @@index([aiAnalysisId])
}
```

**5. ComplianceCheck**
```prisma
model ComplianceCheck {
  id              String   @id @default(cuid())
  aiAnalysisId    String
  regulation      String   // FDA_21CFR11, ICH_GCP, HIPAA, etc.
  status          String   // compliant, non_compliant, needs_review
  finding         String   @db.Text
  recommendation  String?  @db.Text
  severity        String   // low, medium, high, critical

  createdAt       DateTime @default(now())
  aiAnalysis      AiAnalysis @relation(fields: [aiAnalysisId], references: [id], onDelete: Cascade)

  @@index([aiAnalysisId])
  @@index([regulation])
  @@index([status])
  @@index([severity])
}
```

**6. ProtocolSimilarity**
```prisma
model ProtocolSimilarity {
  id                  String   @id @default(cuid())
  aiAnalysisId        String
  similarStudyId      String
  similarityScore     Float    // 0.0 to 1.0
  matchingAspects     Json     // What aspects are similar

  createdAt           DateTime @default(now())
  aiAnalysis          AiAnalysis @relation("SourceAnalysis", fields: [aiAnalysisId], references: [id], onDelete: Cascade)
  similarStudy        Study    @relation(fields: [similarStudyId], references: [id], onDelete: Cascade)

  @@index([aiAnalysisId])
  @@index([similarStudyId])
  @@index([similarityScore])
}
```

**7. UserFeedback**
```prisma
model UserFeedback {
  id              String   @id @default(cuid())
  aiAnalysisId    String
  userId          String
  feedbackType    String   // accuracy, completeness, usefulness
  rating          Int      // 1-5
  comment         String?  @db.Text
  correctedData   Json?    // User corrections for retraining

  createdAt       DateTime @default(now())
  aiAnalysis      AiAnalysis @relation(fields: [aiAnalysisId], references: [id], onDelete: Cascade)
  user            User     @relation(fields: [userId], references: [id])

  @@index([aiAnalysisId])
  @@index([userId])
  @@index([feedbackType])
  @@index([rating])
}
```

### Changes to Existing Models

**Study Model** - Add AI Analysis relation:
```prisma
model Study {
  // ... existing fields ...
  aiAnalysis      AiAnalysis?
  similarities    ProtocolSimilarity[]
  // ... rest of model ...
}
```

**User Model** - Add UserFeedback relation:
```prisma
model User {
  // ... existing fields ...
  aiAnalysisFeedback UserFeedback[]
  // ... rest of model ...
}
```

---

## 📝 Tasks

- [ ] Update `prisma/schema.prisma` with all 7 new models
- [ ] Add relations to Study model
- [ ] Add relations to User model
- [ ] Run `npx prisma format` to format schema
- [ ] Run `npx prisma validate` to check for errors
- [ ] Create migration: `npx prisma migrate dev --name add-ai-analysis-models`
- [ ] Verify migration SQL is correct
- [ ] Test migration on clean database
- [ ] Run `npx prisma generate` to regenerate Prisma Client
- [ ] Test that all models are accessible in code
- [ ] Update `.env` if needed
- [ ] Document schema changes in CLAUDE.md

---

## 🧪 Testing

**Manual Testing:**
1. Create new AiAnalysis record
2. Add related Criterion records
3. Add VisitSchedule records
4. Verify cascade deletes work correctly
5. Test indexes with sample queries
6. Verify foreign key constraints

**SQL Queries to Test:**
```sql
-- Test AiAnalysis creation
SELECT * FROM AiAnalysis WHERE status = 'completed';

-- Test criteria filtering
SELECT * FROM Criterion WHERE type = 'inclusion' AND category = 'age';

-- Test visit schedule ordering
SELECT * FROM VisitSchedule WHERE aiAnalysisId = 'xxx' ORDER BY visitNumber;

-- Test compliance checks by severity
SELECT * FROM ComplianceCheck WHERE severity = 'critical';
```

---

## 📚 Documentation

**Files to Update:**
- `.claude/CLAUDE.md` - Add database schema section
- `prisma/schema.prisma` - Inline comments for complex fields

---

## 🔗 Dependencies

**Blocks:**
- #TBD - AI Protocol Analysis API endpoint
- #TBD - Criteria extraction pipeline
- #TBD - Visit schedule generation

**Depends on:**
- None (foundational work)

---

## ⚠️ Risks & Considerations

1. **Data Types:** Ensure `Decimal` type works correctly in both SQLite and PostgreSQL
2. **Text Fields:** Use `@db.Text` for long content to avoid truncation
3. **Cascade Deletes:** Properly configure `onDelete: Cascade` to maintain referential integrity
4. **Indexes:** Add indexes carefully to balance query performance vs. write performance
5. **Migration Rollback:** Test rollback procedure in case issues arise

---

## 📦 Files to Modify

- `prisma/schema.prisma`
- `prisma/migrations/*/migration.sql` (new)
- `.claude/CLAUDE.md` (documentation update)

---

## ✅ Definition of Done

- [ ] All models added to schema
- [ ] Migration created and applied successfully
- [ ] Prisma Client regenerated
- [ ] No TypeScript errors
- [ ] Manual testing completed
- [ ] Documentation updated
- [ ] Code committed with proper commit message
- [ ] PR ready for review

---

**Created:** 2025-01-23
**Assignee:** @jeffbander (or Claude Code)
**Labels:** `feature`, `database`, `ai-enhancement`, `priority: high`
