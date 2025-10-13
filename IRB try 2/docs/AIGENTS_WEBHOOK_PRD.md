# Product Requirements Document: Aigents Bidirectional Webhook System

## Executive Summary

Implement a complete bidirectional webhook system for the IRB Management System to enable asynchronous AI document analysis through Aigents. The system will trigger Aigents chains when documents are uploaded and receive analysis results via webhooks.

---

## Problem Statement

**Current State:**
- Documents are sent to Aigents API synchronously
- System waits 15-25 seconds for response
- No way to track long-running analyses
- No persistent storage of AI results
- Cannot handle analyses that take minutes/hours

**Desired State:**
- Fire-and-forget document submission
- Asynchronous webhook-based result delivery
- Persistent tracking of all AI analyses
- Support for long-running chains
- Complete audit trail of AI interactions

---

## Goals & Non-Goals

### Goals
✅ Implement outbound webhook triggering to Aigents
✅ Implement inbound webhook receiver for results
✅ Create database schema for automation logs
✅ Link requests to responses via Chain Run ID
✅ Support multiple document types and chains
✅ Provide UI for viewing analysis status and results
✅ Enable webhook testing in development
✅ Create reusable webhook package for future chains

### Non-Goals
❌ Real-time WebSocket updates (use polling initially)
❌ Webhook retry logic (rely on Aigents)
❌ Custom chain builder UI
❌ Multi-tenant webhook isolation (single tenant for now)

---

## User Stories

### Story 1: Document Upload Triggers AI Analysis
**As a** researcher
**I want to** upload a protocol document and have it automatically analyzed by AI
**So that** I can receive compliance feedback without manual review

**Acceptance Criteria:**
- Document upload triggers Aigents chain automatically
- System shows "Analysis in progress" status
- Chain Run ID is stored and visible
- No blocking wait during upload

### Story 2: Receive AI Analysis Results
**As a** researcher
**I want to** see AI analysis results when they're ready
**So that** I can review compliance recommendations

**Acceptance Criteria:**
- Webhook receives results from Aigents
- Results are linked to correct document
- UI updates to show "Analysis complete"
- Full analysis text is visible in document view

### Story 3: Track Analysis History
**As an** admin
**I want to** view all AI analyses performed
**So that** I can audit AI usage and troubleshoot issues

**Acceptance Criteria:**
- All automation logs are stored persistently
- Logs include request data, response data, timestamps
- Logs show success/failure status
- Searchable and filterable log view

---

## Technical Architecture

### System Components

```
┌─────────────────┐
│   IRB System    │
│   (Next.js)     │
└────────┬────────┘
         │
         │ 1. Upload Document
         ▼
┌─────────────────┐
│  Trigger        │
│  Aigents API    │◄─── POST to start-chain-run endpoint
└────────┬────────┘
         │
         │ 2. Returns Chain Run ID
         ▼
┌─────────────────┐
│  Save to DB     │
│  (Prisma)       │◄─── Store automation log
└─────────────────┘      uniqueId = Chain Run ID
         │                isCompleted = false
         │
         │ 3. AIGENTS processes...
         │    (could take seconds/minutes)
         │
         ▼
┌─────────────────┐
│  Aigents sends  │
│  webhook back   │──── POST /api/webhooks/aigents
└────────┬────────┘
         │
         │ 4. Contains Chain Run ID
         ▼
┌─────────────────┐
│  Webhook        │
│  Handler        │◄─── Extract response & ID
└────────┬────────┘
         │
         │ 5. Update DB by Chain Run ID
         ▼
┌─────────────────┐
│  Frontend       │
│  Polling        │◄─── Checks isCompleted
└─────────────────┘      Shows results when ready
```

### Database Schema

```typescript
model AutomationLog {
  id                String    @id @default(cuid())
  chainName         String    // "Protocol analyzer"
  chainRunId        String    @unique // THE KEY IDENTIFIER
  documentId        String?   // Link to document
  studyId           String?   // Link to study

  // Request tracking
  requestData       Json?     // What we sent to Aigents
  requestedAt       DateTime  @default(now())
  requestedBy       String?   // User ID

  // Response tracking
  webhookPayload    Json?     // Complete webhook received
  agentResponse     String?   // Parsed response text
  agentReceivedAt   DateTime?

  // Status
  isCompleted       Boolean   @default(false)
  status            String    @default("processing") // processing|completed|failed
  errorMessage      String?

  // Relations
  document          Document? @relation(fields: [documentId], references: [id])
  user              User?     @relation(fields: [requestedBy], references: [id])

  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
}
```

---

## API Specifications

### Outbound: Trigger Aigents

**Endpoint:** `POST https://start-chain-run-943506065004.us-central1.run.app`

**Request:**
```json
{
  "run_email": "Mills.reed@mswheart.com",
  "chain_to_run": "Protocol analyzer",
  "human_readable_record": "IRB Document Upload",
  "source_id": "document-id-xyz",
  "first_step_user_input": "Analyze this protocol document...",
  "starting_variables": {
    "document_id": "doc-123",
    "document_name": "Protocol.pdf",
    "document_type": "PROTOCOL",
    "study_id": "study-456"
  }
}
```

**Response:**
```json
{
  "ChainRun_ID": "abc123def456",
  "status": "success",
  "message": "Chain triggered successfully"
}
```

### Inbound: Receive Webhook

**Endpoint:** `POST /api/webhooks/aigents`

**Request from Aigents:**
```json
{
  "Chain Run ID": "abc123def456",
  "agentResponse": "Protocol Analysis Complete\n\nKey Findings:\n...",
  "summ": "Analysis summary",
  "Final_Output": "Complete analysis text",
  "Generated_Content": "AI-generated recommendations",
  "status": "completed"
}
```

**Response to Aigents:**
```json
{
  "message": "Webhook processed successfully",
  "chainRunId": "abc123def456",
  "status": "success"
}
```

---

## Implementation Plan

### Phase 1: Database & Core Infrastructure (2-3 hours)

**Tasks:**
1. ✅ Create `AutomationLog` Prisma model
2. ✅ Run migration to add table
3. ✅ Create storage service for automation logs
4. ✅ Add indexes for `chainRunId` and `documentId`

**Files to Create/Modify:**
- `prisma/schema.prisma`
- `lib/automation-logs.ts` (storage service)

### Phase 2: Outbound Webhook (Trigger) (2-3 hours)

**Tasks:**
1. ✅ Create reusable Aigents trigger function
2. ✅ Extract Chain Run ID from response
3. ✅ Update existing document upload to trigger automatically
4. ✅ Save automation log on trigger
5. ✅ Handle errors gracefully

**Files to Create/Modify:**
- `lib/aigents-webhook.ts` (trigger package)
- `app/api/documents/[documentId]/aigents/route.ts` (update existing)

### Phase 3: Inbound Webhook (Receiver) (2-3 hours)

**Tasks:**
1. ✅ Create `/api/webhooks/aigents` endpoint
2. ✅ Extract Chain Run ID from multiple field names
3. ✅ Extract response from multiple field names
4. ✅ Update automation log by Chain Run ID
5. ✅ Handle missing logs gracefully
6. ✅ Add webhook authentication/validation

**Files to Create:**
- `app/api/webhooks/aigents/route.ts`

### Phase 4: Frontend Integration (3-4 hours)

**Tasks:**
1. ✅ Add automation log status to document view
2. ✅ Create polling mechanism (React Query)
3. ✅ Display "Analysis in progress" state
4. ✅ Display analysis results when complete
5. ✅ Show Chain Run ID for debugging
6. ✅ Add refresh button

**Files to Modify:**
- `app/studies/[id]/page.tsx`
- `components/DocumentAnalysisStatus.tsx` (new)

### Phase 5: Admin Dashboard (2 hours)

**Tasks:**
1. ✅ Create automation logs list view
2. ✅ Show status, timestamps, chain names
3. ✅ Add filtering by status/date
4. ✅ Link to associated documents
5. ✅ Show request/response payloads

**Files to Create:**
- `app/automation-logs/page.tsx`
- `app/api/automation-logs/route.ts`

### Phase 6: Testing & Documentation (2-3 hours)

**Tasks:**
1. ✅ Set up ngrok for local webhook testing
2. ✅ Create test script for webhooks
3. ✅ Update Playwright tests
4. ✅ Document webhook configuration in Aigents
5. ✅ Create troubleshooting guide

**Files to Create:**
- `docs/WEBHOOK_TESTING.md`
- `tests/webhook-flow.spec.ts`
- `scripts/test-webhook.ts`

---

## Success Metrics

### Functional Metrics
- ✅ Webhooks successfully received from Aigents
- ✅ 100% of Chain Run IDs correctly matched
- ✅ Zero data loss between request and response
- ✅ Response time < 500ms for webhook processing

### User Experience Metrics
- ✅ No blocking waits during document upload
- ✅ Results visible within 30 seconds of completion
- ✅ Clear status indicators (processing/complete/failed)
- ✅ Full analysis text readable in UI

### Technical Metrics
- ✅ All automation logs persisted to database
- ✅ Webhook endpoint uptime > 99%
- ✅ Error handling covers all edge cases
- ✅ Complete audit trail maintained

---

## Security Considerations

### Webhook Authentication
- [ ] Implement HMAC signature validation
- [ ] Use `AIGENTS_WEBHOOK_SECRET` from env
- [ ] Reject unsigned webhooks
- [ ] Log all webhook attempts

### Data Privacy
- [ ] Store only necessary data in logs
- [ ] Sanitize PHI before sending to Aigents
- [ ] Encrypt sensitive fields in database
- [ ] Implement data retention policy

### Rate Limiting
- [ ] Limit webhook endpoint to prevent abuse
- [ ] Implement exponential backoff for Aigents triggers
- [ ] Monitor for unusual patterns

---

## Rollout Plan

### Development Environment
1. Deploy with mock webhook responses
2. Test with manual curl commands
3. Use ngrok for local webhook testing

### Staging Environment
1. Configure real Aigents webhook URL
2. Test with sample documents
3. Verify end-to-end flow

### Production Deployment
1. Deploy webhook endpoint first
2. Update Aigents configuration
3. Enable automatic triggering
4. Monitor for 24 hours
5. Full rollout

---

## Rollback Plan

If issues arise:
1. Disable automatic triggering (keep manual)
2. Revert to synchronous API calls
3. Keep automation logs for audit
4. Fix issues in staging
5. Re-deploy when stable

---

## Future Enhancements

### Phase 2 Features
- WebSocket real-time updates
- Webhook retry logic with exponential backoff
- Multiple webhook endpoints per chain
- Chain output formatting/parsing
- Email notifications on completion

### Advanced Features
- Custom chain builder UI
- A/B testing different chains
- Performance analytics dashboard
- Automatic chain selection based on document type

---

## Appendix A: Field Name Mapping

Aigents may return responses in various field names. We'll check all:

**Chain Run ID:**
- `chainRunId`
- `Chain Run ID`
- `ChainRun_ID`
- `chain_run_id`
- `runId`

**Response Content:**
- `agentResponse`
- `summ`
- `summary`
- `response`
- `content`
- `result`
- `output`
- `Final_Output`
- `Generated_Content`
- `Patient_Summary`
- `Analysis_Result`

---

## Appendix B: Example Webhook Payloads

### Successful Analysis
```json
{
  "Chain Run ID": "abc123",
  "agentResponse": "Protocol Analysis Complete\n\nKey Findings:\n- Study design is sound\n- Endpoints clearly defined\n\nRecommendations:\n- Add clarification on exclusion criteria",
  "status": "completed",
  "timestamp": "2025-10-10T02:00:00Z"
}
```

### Failed Analysis
```json
{
  "Chain Run ID": "def456",
  "status": "failed",
  "error": "Unable to parse document format",
  "timestamp": "2025-10-10T02:00:00Z"
}
```

---

## Sign-off

**Product Owner:** Jeffrey Bander
**Engineering Lead:** Claude (AI Assistant)
**Target Completion:** 1-2 days
**Status:** Ready for Implementation

---

*Last Updated: 2025-10-10*
*Version: 1.0*
