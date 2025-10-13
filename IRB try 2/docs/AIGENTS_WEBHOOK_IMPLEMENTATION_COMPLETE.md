# Aigents Webhook Integration - Implementation Complete ✅

## Overview

The Aigents webhook integration has been successfully implemented using a bidirectional webhook pattern. This allows the IRB Management System to:

1. **Trigger AI analysis** on documents (manual, user-initiated)
2. **Track analysis progress** using Chain Run IDs
3. **Receive webhook callbacks** when analysis completes
4. **Display results** automatically in the UI

## What Was Implemented

### 1. Database Schema ✅

**File**: `prisma/schema.prisma`

Added `AutomationLog` model to track webhook lifecycle:

```prisma
model AutomationLog {
  id              String    @id @default(cuid())
  chainName       String
  chainRunId      String    @unique  // Links request → webhook response
  documentId      String?
  studyId         String?
  requestedBy     String?
  requestData     String?
  requestedAt     DateTime  @default(now())
  webhookPayload  String?
  agentResponse   String?
  agentReceivedAt DateTime?
  isCompleted     Boolean   @default(false)
  status          String    @default("processing")
  errorMessage    String?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}
```

**Migration**: `prisma/migrations/20251010025854_add_automation_logs/migration.sql`

Updated `Document` model with relation:
```prisma
model Document {
  // ... existing fields
  automationLogs AutomationLog[]
}
```

### 2. Automation Logs Storage Service ✅

**File**: `lib/automation-logs.ts`

Created complete CRUD service for AutomationLog:

**Key Functions**:
- `createAutomationLog()` - Create when triggering Aigents
- `updateAutomationLogByChainRunId()` - **THE KEY FUNCTION** - Updates log when webhook arrives
- `getAutomationLogByChainRunId()` - Find log by Chain Run ID
- `getAutomationLogByDocumentId()` - Get most recent log for document
- `getAutomationLogsByStudyId()` - Get all logs for a study
- `getAllAutomationLogs()` - Admin view of all automations
- `getPendingAutomationLogs()` - Get all processing logs
- `markAutomationLogAsFailed()` - Mark log as failed

### 3. Aigents Webhook Integration Package ✅

**File**: `lib/aigents-webhook.ts`

Reusable package for Aigents integration:

**Key Functions**:

1. **`triggerAigentsChain()`** - Trigger Aigents chain
   - Sends document to Aigents API
   - Extracts Chain Run ID from response
   - Returns immediately (doesn't wait for analysis)

2. **`extractChainRunId()`** - Extract Chain Run ID from response
   - Tries multiple field name patterns:
     - `ChainRun_ID`
     - `Chain Run ID`
     - `chainRunId`
     - `chain_run_id`
     - `runId`

3. **`extractAgentResponse()`** - Extract analysis from webhook
   - Tries multiple field names:
     - `agentResponse`
     - `summ`
     - `summary`
     - `Final_Output`
     - `Generated_Content`
     - `Protocol_Analysis`
     - `Consent_Review`
     - `Document_Analysis`
     - And more...

4. **`getChainNameForDocumentType()`** - Map document type to chain
   - PROTOCOL → "Protocol analyzer"
   - CONSENT_FORM → "Consent Form Reviewer"
   - ADVERSE_EVENT → "Adverse Event Analyzer"
   - Others → "Document Analyzer"

### 4. Webhook Receiver Endpoint ✅

**File**: `app/api/webhooks/aigents/route.ts`

**Endpoint**: `POST /api/webhooks/aigents`

This is where Aigents sends webhook when analysis completes.

**Flow**:
1. Parse webhook payload from Aigents
2. Extract Chain Run ID (the unique identifier)
3. Find AutomationLog by Chain Run ID
4. Extract agent response/analysis
5. Update AutomationLog with results
6. Update Document with AI analysis
7. Create audit log
8. Return success to Aigents

**Health Check**: `GET /api/webhooks/aigents`

Returns statistics about webhook processing:
```json
{
  "message": "Aigents webhook endpoint is active",
  "stats": {
    "totalAutomations": 150,
    "completed": 145,
    "pending": 5
  }
}
```

### 5. Document Analysis Trigger Endpoint ✅

**File**: `app/api/documents/[documentId]/aigents/route.ts`

**Endpoint**: `POST /api/documents/:documentId/aigents`

Completely rewritten to use new webhook pattern:

**Old Behavior** (removed):
- Used old `startAigentsChain()` function
- Had mock/real mode toggle
- No webhook tracking

**New Behavior**:
1. Determine chain name from document type (automatic)
2. Read document content
3. Trigger Aigents chain via `triggerAigentsChain()`
4. Get Chain Run ID from response
5. Create AutomationLog with Chain Run ID
6. Update Document status to "processing"
7. Create audit log
8. Return immediately with status "processing"

**Response**:
```json
{
  "success": true,
  "chainRunId": "abc123xyz789",
  "chainName": "Protocol analyzer",
  "status": "processing",
  "automationLogId": "log_abc123",
  "message": "AI analysis started. Results will appear when processing completes (15-25 seconds).",
  "expectedCompletionTime": "15-25 seconds"
}
```

### 6. UI with Polling ✅

**File**: `app/studies/[id]/components/DocumentsList.tsx`

Complete UI overhaul for new webhook pattern:

**Features**:

1. **Manual Trigger Button**:
   - Shows "🤖 Analyze with AI" for documents without analysis
   - Shows "🔄 Re-analyze" for previously analyzed documents
   - Shows "⏳ Processing..." when analysis is running (disabled)

2. **Confirmation Modal**:
   - Explains how AI analysis works
   - Shows chain that will be used
   - Warns if re-analyzing existing document
   - Shows expected completion time

3. **Status Badges**:
   - "AI: Pending" (yellow)
   - "AI: Processing..." (blue, animated pulse)
   - "AI: Completed" (green)
   - "AI: Failed" (red)

4. **15-Second Polling**:
   - Automatically polls when documents are processing
   - Checks every 15 seconds for updates
   - Stops polling when no documents processing
   - Console logs for debugging

5. **Analysis Display**:
   - "✅ View Analysis" button when completed
   - "❌ View Error" button when failed
   - Modal shows full AI analysis
   - Chain name, Run ID, and status displayed
   - Different styling for success vs error

**Polling Implementation**:
```typescript
useEffect(() => {
  const processingDocs = documents.filter(doc => doc.aigentsStatus === 'processing');

  if (processingDocs.length > 0) {
    console.log(`📡 Polling enabled for ${processingDocs.length} processing documents`);

    pollingIntervalRef.current = setInterval(() => {
      console.log('🔄 Polling for document updates...');
      onDocumentUpdate();
    }, 15000); // 15 seconds
  } else {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }
  }

  return () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }
  };
}, [documents, onDocumentUpdate]);
```

## How It Works (Complete Flow)

### Step 1: User Triggers Analysis

1. User uploads document (e.g., Protocol document)
2. Document appears in study page
3. User clicks "🤖 Analyze with AI"
4. Confirmation modal appears
5. User confirms

### Step 2: System Triggers Aigents

```
POST /api/documents/:documentId/aigents
```

1. Determine chain: PROTOCOL → "Protocol analyzer"
2. Read document content
3. Call Aigents API via `triggerAigentsChain()`
4. Aigents returns Chain Run ID: "abc123xyz789"
5. Create AutomationLog:
   ```
   chainRunId: "abc123xyz789"
   status: "processing"
   isCompleted: false
   ```
6. Update Document:
   ```
   aigentsStatus: "processing"
   aigentsRunId: "abc123xyz789"
   ```
7. Return to UI: "AI analysis started..."

### Step 3: UI Polls for Updates

1. UI sees document with status "processing"
2. Starts 15-second polling interval
3. Every 15 seconds:
   ```
   GET /api/studies/:id
   ```
4. Checks if `aigentsStatus` changed
5. Shows animated "AI: Processing..." badge

### Step 4: Aigents Processes Document

1. Aigents receives request
2. Runs "Protocol analyzer" chain
3. Takes 15-25 seconds
4. Analysis completes

### Step 5: Aigents Sends Webhook

```
POST /api/webhooks/aigents

{
  "Chain Run ID": "abc123xyz789",
  "agentResponse": "This protocol document outlines a Phase 3 clinical trial...",
  "status": "completed"
}
```

### Step 6: Webhook Receiver Processes

1. Extract Chain Run ID: "abc123xyz789"
2. Find AutomationLog where `chainRunId = "abc123xyz789"`
3. Extract analysis from webhook
4. Update AutomationLog:
   ```
   agentResponse: "This protocol document..."
   status: "completed"
   isCompleted: true
   agentReceivedAt: now()
   ```
5. Update Document:
   ```
   aigentsStatus: "completed"
   aigentsAnalysis: "This protocol document..."
   aigentsCompletedAt: now()
   ```
6. Create audit log
7. Return success to Aigents

### Step 7: UI Shows Results

1. Next polling request (max 15 seconds later)
2. Document now has `aigentsStatus = "completed"`
3. Badge changes to "AI: Completed" (green)
4. "✅ View Analysis" button appears
5. Polling stops
6. User clicks "View Analysis"
7. Modal shows full AI analysis

## Key Design Decisions

### 1. Chain Run ID as Unique Identifier

**Why**: Aigents may process multiple documents simultaneously. We need a unique way to link each webhook response to its original request.

**Solution**: Use Aigents' Chain Run ID as the unique key. Store it in AutomationLog table with unique constraint.

### 2. 15-Second Polling vs WebSockets

**Why**: WebSockets add complexity (server state, connection management, Vercel limitations)

**Solution**: Simple 15-second polling when documents are processing. Starts/stops automatically. Good enough for 15-25 second processing time.

### 3. Separate AutomationLog Table

**Why**: Document table should focus on document metadata, not webhook tracking

**Solution**: Create separate AutomationLog table for webhook lifecycle tracking. Links to Document via documentId.

### 4. Automatic Chain Selection

**Why**: Don't make user choose - they just want AI analysis

**Solution**: Map document type to chain automatically:
- Protocol analyzer for PROTOCOL docs
- Consent Form Reviewer for CONSENT_FORM docs
- Etc.

### 5. Return Immediately from Trigger

**Why**: Don't make user wait 15-25 seconds with loading spinner

**Solution**: Trigger returns immediately with "processing" status. UI polls and shows results when ready.

## Testing the Integration

### Local Development Setup

1. **Start Next.js server**:
   ```bash
   npm run dev
   ```

2. **Start ngrok tunnel** (in separate terminal):
   ```bash
   ngrok http 3000
   ```

3. **Configure Aigents webhook URL**:
   ```
   https://abc123.ngrok.io/api/webhooks/aigents
   ```

4. **Test complete flow**:
   - Upload document
   - Click "Analyze with AI"
   - Watch status change to "Processing..."
   - Wait 15-25 seconds
   - Status changes to "Completed"
   - Click "View Analysis"

### Manual Webhook Test

Test webhook endpoint directly:

```bash
curl -X POST http://localhost:3000/api/webhooks/aigents \
  -H "Content-Type: application/json" \
  -d '{
    "Chain Run ID": "test123",
    "agentResponse": "This is a test AI analysis response.",
    "status": "completed"
  }'
```

Expected response:
```json
{
  "error": "Automation log not found",
  "chainRunId": "test123"
}
```

(Because "test123" doesn't exist in database)

### Health Check

```bash
curl http://localhost:3000/api/webhooks/aigents
```

Returns webhook endpoint status and statistics.

## Files Modified/Created

### Created Files ✅

1. `lib/automation-logs.ts` - AutomationLog CRUD service
2. `lib/aigents-webhook.ts` - Aigents integration package
3. `prisma/migrations/20251010025854_add_automation_logs/migration.sql` - Database migration
4. `docs/AIGENTS_WEBHOOK_SETUP.md` - Setup and configuration guide
5. `AIGENTS_WEBHOOK_IMPLEMENTATION_COMPLETE.md` - This document

### Modified Files ✅

1. `prisma/schema.prisma` - Added AutomationLog model, updated Document
2. `app/api/webhooks/aigents/route.ts` - Completely rewritten for webhook pattern
3. `app/api/documents/[documentId]/aigents/route.ts` - Completely rewritten for trigger
4. `app/studies/[id]/components/DocumentsList.tsx` - Complete UI overhaul with polling

## Environment Variables Required

```env
# Aigents Configuration
AIGENTS_API_URL=https://start-chain-run-943506065004.us-central1.run.app
AIGENTS_EMAIL=Mills.reed@mswheart.com

# Database
DATABASE_URL=file:./dev.db

# Next.js
NEXT_PUBLIC_API_URL=http://localhost:3000
```

## Next Steps

### Immediate (Before Testing)

1. ✅ Implementation complete
2. ⏳ **Configure Aigents chains** in Aigents dashboard
3. ⏳ **Set up webhook URL** in each Aigents chain
4. ⏳ **Test with ngrok** for local development
5. ⏳ **Upload test document** and trigger analysis
6. ⏳ **Verify webhook received** in server logs
7. ⏳ **Confirm results displayed** in UI

### Production Deployment

1. ⏳ Migrate database to PostgreSQL (SQLite doesn't work on Vercel)
2. ⏳ Deploy to Vercel
3. ⏳ Update Aigents webhook URL to production domain
4. ⏳ Add webhook authentication (optional but recommended)
5. ⏳ Set up monitoring/alerting for failed webhooks
6. ⏳ Add retry logic for failed webhook deliveries

### Optional Enhancements

1. ⏳ Webhook signature verification for security
2. ⏳ Retry mechanism for failed Aigents calls
3. ⏳ Admin dashboard for AutomationLog monitoring
4. ⏳ Email notifications when analysis completes
5. ⏳ Batch analysis (multiple documents at once)
6. ⏳ Export analysis results to PDF
7. ⏳ Analysis history/versioning

## Troubleshooting Guide

### Problem: Webhook not received

**Check**:
1. Is ngrok running? (for local dev)
2. Is webhook URL correct in Aigents?
3. Check server logs for incoming POST to `/api/webhooks/aigents`
4. Test endpoint manually with curl

**Solution**: Verify ngrok tunnel and webhook configuration

### Problem: Chain Run ID not found

**Check**:
1. Does AutomationLog exist with that Chain Run ID?
2. Did Aigents response include Chain Run ID?
3. Check `extractChainRunId()` patterns

**Solution**: Add console.log to see Aigents response format

### Problem: Analysis stuck in "Processing"

**Check**:
1. Was webhook received? (GET /api/webhooks/aigents shows stats)
2. Check AutomationLog table for isCompleted status
3. Check Aigents dashboard for chain run status

**Solution**:
- If webhook never arrived: check Aigents webhook config
- If webhook arrived but failed: check error logs
- If webhook succeeded but UI not updated: check polling logic

### Problem: Polling not working

**Check**:
1. Console logs - should see "📡 Polling enabled"
2. Network tab - should see GET requests every 15 seconds
3. Document status in database

**Solution**: Check useEffect dependencies and cleanup

## Security Considerations

### Current Implementation

- ✅ Authentication required to trigger analysis
- ✅ Audit logs for all actions
- ✅ User ID tracked in AutomationLog
- ❌ No webhook signature verification
- ❌ No rate limiting on webhook endpoint

### Recommended for Production

1. **Add webhook signature verification**:
   ```typescript
   const signature = request.headers.get('X-Aigents-Signature');
   const expectedSignature = generateHMAC(webhookBody, WEBHOOK_SECRET);
   if (signature !== expectedSignature) {
     return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
   }
   ```

2. **Add rate limiting**:
   ```typescript
   const rateLimiter = new RateLimiter({
     max: 100, // 100 requests
     windowMs: 60000 // per minute
   });
   ```

3. **Add IP whitelist** (if Aigents has static IPs):
   ```typescript
   const allowedIPs = ['1.2.3.4', '5.6.7.8'];
   const clientIP = request.headers.get('x-forwarded-for');
   if (!allowedIPs.includes(clientIP)) {
     return NextResponse.json({ error: 'Unauthorized IP' }, { status: 403 });
   }
   ```

## Performance Metrics

### Expected Performance

- Trigger endpoint: < 1 second (just creates log, returns immediately)
- Aigents processing: 15-25 seconds
- Webhook processing: < 100ms
- UI polling: 15 second intervals
- Total user wait: 15-40 seconds (15-25s processing + up to 15s polling delay)

### Monitoring Queries

**Average processing time**:
```sql
SELECT AVG(
  (julianday(agentReceivedAt) - julianday(requestedAt)) * 86400
) as avg_seconds
FROM AutomationLog
WHERE isCompleted = true;
```

**Success rate**:
```sql
SELECT
  status,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM AutomationLog), 2) as percentage
FROM AutomationLog
GROUP BY status;
```

**Recent activity**:
```sql
SELECT
  chainName,
  status,
  createdAt,
  agentReceivedAt
FROM AutomationLog
ORDER BY createdAt DESC
LIMIT 20;
```

## Conclusion

The Aigents webhook integration is **complete and ready for testing**.

The implementation follows the bidirectional webhook pattern from the Replit documentation, adapted for:
- Current Prisma + SQLite database
- Multiple document types with different chains
- Manual user-triggered analysis (not automatic)
- 15-second polling for completion
- Vercel-compatible architecture

All core functionality is implemented:
- ✅ Database schema
- ✅ Storage service
- ✅ Webhook integration package
- ✅ Trigger endpoint
- ✅ Webhook receiver
- ✅ UI with polling
- ✅ Documentation

**Next step**: Configure Aigents webhook URL and test the complete flow!
