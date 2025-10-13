# Aigents Webhook Integration - Setup Guide

## Overview

This IRB Management System uses a **bidirectional webhook pattern** to integrate with Aigents AI for document analysis:

1. **Outbound**: App triggers Aigents chain and receives Chain Run ID
2. **Processing**: Aigents processes document (15-25 seconds)
3. **Inbound**: Aigents sends webhook to app with results
4. **Matching**: Chain Run ID links the request → response

## Architecture Diagram

```
┌─────────────────┐                      ┌──────────────────┐
│   IRB System    │                      │     Aigents      │
│                 │                      │                  │
│  User clicks    │  1. Trigger Chain    │                  │
│  "Analyze AI"   │ ──────────────────>  │  Chain starts    │
│                 │  (POST /trigger)     │  processing...   │
│                 │                      │                  │
│  Receives       │  2. Chain Run ID     │                  │
│  Chain Run ID   │ <──────────────────  │  Returns ID      │
│  Creates        │                      │  immediately     │
│  AutomationLog  │                      │                  │
│                 │                      │                  │
│  Status:        │                      │  [15-25 sec]     │
│  "processing"   │                      │                  │
│                 │                      │                  │
│  UI polls       │  3. Webhook          │  Analysis done   │
│  every 15 sec   │ <──────────────────  │                  │
│                 │  (POST /webhooks)    │  Sends results   │
│                 │                      │                  │
│  Matches by     │                      │                  │
│  Chain Run ID   │                      │                  │
│  Updates        │                      │                  │
│  Document       │                      │                  │
│                 │                      │                  │
│  UI shows       │                      │                  │
│  analysis!      │                      │                  │
└─────────────────┘                      └──────────────────┘
```

## Key Components

### 1. Database (AutomationLog Model)

**File**: `prisma/schema.prisma`

The AutomationLog model tracks webhook lifecycle:

```prisma
model AutomationLog {
  id              String    @id @default(cuid())
  chainName       String    // "Protocol analyzer", "Consent Form Reviewer"
  chainRunId      String    @unique // THE KEY - links request to response

  documentId      String?
  studyId         String?
  requestedBy     String?

  requestData     String?   // JSON of what we sent
  requestedAt     DateTime  @default(now())

  webhookPayload  String?   // JSON of complete webhook
  agentResponse   String?   // Parsed response text
  agentReceivedAt DateTime?

  isCompleted     Boolean   @default(false)
  status          String    @default("processing")
  errorMessage    String?
}
```

### 2. Storage Service

**File**: `lib/automation-logs.ts`

Functions for CRUD operations on AutomationLog:

- `createAutomationLog()` - Create when triggering chain
- `updateAutomationLogByChainRunId()` - Update when webhook arrives
- `getAutomationLogByChainRunId()` - Find log by Chain Run ID
- `getPendingAutomationLogs()` - Get all processing logs

### 3. Webhook Trigger Package

**File**: `lib/aigents-webhook.ts`

Reusable functions for Aigents integration:

- `triggerAigentsChain()` - Trigger a chain, returns Chain Run ID
- `extractChainRunId()` - Extract ID from Aigents response
- `extractAgentResponse()` - Extract analysis from webhook
- `getChainNameForDocumentType()` - Map document type to chain

### 4. Trigger Endpoint

**File**: `app/api/documents/[documentId]/aigents/route.ts`

When user clicks "Analyze with AI":

1. Determine chain name from document type
2. Trigger Aigents chain via `triggerAigentsChain()`
3. Get Chain Run ID from response
4. Create AutomationLog with Chain Run ID
5. Update Document status to "processing"
6. Return immediately (don't wait for analysis)

### 5. Webhook Receiver Endpoint

**File**: `app/api/webhooks/aigents/route.ts`

When Aigents sends webhook:

1. Extract Chain Run ID from webhook payload
2. Find AutomationLog by Chain Run ID
3. Extract agent response from webhook
4. Update AutomationLog with response
5. Update Document with analysis results
6. Create audit log
7. Return success to Aigents

**Endpoint**: `POST /api/webhooks/aigents`

### 6. UI with Polling

**File**: `app/studies/[id]/components/DocumentsList.tsx`

- Shows "Analyze with AI" button
- Triggers analysis endpoint
- Polls every 15 seconds when documents are processing
- Shows processing status with animation
- Displays results when complete

## Setup Instructions

### Step 1: Configure Aigents Chains

In your Aigents dashboard, create these chains:

1. **Protocol analyzer** - For PROTOCOL documents
2. **Consent Form Reviewer** - For CONSENT_FORM documents
3. **Adverse Event Analyzer** - For ADVERSE_EVENT documents
4. **Document Analyzer** - Generic fallback for other types

### Step 2: Configure Webhook URL in Aigents

For each chain, set the webhook callback URL to:

**Production**: `https://your-domain.com/api/webhooks/aigents`

**Development (local)**: Use ngrok or similar tunnel service

#### Local Development with ngrok:

1. Install ngrok: `npm install -g ngrok`

2. Start your Next.js dev server:
   ```bash
   npm run dev
   ```

3. In another terminal, start ngrok:
   ```bash
   ngrok http 3000
   ```

4. Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)

5. Configure webhook URL in Aigents:
   ```
   https://abc123.ngrok.io/api/webhooks/aigents
   ```

6. Keep ngrok running while testing

### Step 3: Environment Variables

Ensure these environment variables are set:

```env
# Aigents API Configuration
AIGENTS_API_URL=https://start-chain-run-943506065004.us-central1.run.app
AIGENTS_EMAIL=Mills.reed@mswheart.com

# Database
DATABASE_URL=file:./dev.db

# Next.js
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### Step 4: Test the Integration

1. **Upload a document**:
   - Go to a study
   - Upload a PROTOCOL document

2. **Trigger AI analysis**:
   - Click "🤖 Analyze with AI"
   - Confirm in modal
   - Status changes to "AI: Processing..."

3. **Wait for webhook**:
   - Aigents processes (15-25 seconds)
   - Webhook arrives at `/api/webhooks/aigents`
   - Status updates to "AI: Completed"

4. **View results**:
   - Click "✅ View Analysis"
   - See AI analysis in modal

## Webhook Payload Examples

### Aigents Sends (to our webhook endpoint):

```json
{
  "Chain Run ID": "abc123xyz789",
  "chainRunId": "abc123xyz789",
  "status": "completed",
  "agentResponse": "This protocol document outlines...",
  "summ": "This protocol document outlines...",
  "Final_Output": "This protocol document outlines...",
  "Protocol_Analysis": "This protocol document outlines..."
}
```

Our system tries multiple field names to extract:
- Chain Run ID
- Agent response/analysis

### We Send (to Aigents):

```json
{
  "run_email": "Mills.reed@mswheart.com",
  "chain_to_run": "Protocol analyzer",
  "human_readable_record": "IRB Management System - Document Analysis",
  "source_id": "doc_abc123",
  "first_step_user_input": "Analyze this PROTOCOL document...",
  "starting_variables": {
    "document_id": "doc_abc123",
    "document_name": "Phase 3 Clinical Trial Protocol",
    "document_type": "PROTOCOL",
    "study_id": "study_xyz789",
    "analysis_type": "full"
  }
}
```

## Troubleshooting

### Webhook Not Received

1. **Check webhook URL configuration** in Aigents dashboard
2. **Verify ngrok is running** (for local dev)
3. **Check server logs** for incoming webhook
4. **Test webhook endpoint** manually:

```bash
curl -X POST http://localhost:3000/api/webhooks/aigents \
  -H "Content-Type: application/json" \
  -d '{
    "Chain Run ID": "test123",
    "agentResponse": "Test analysis"
  }'
```

### Chain Run ID Not Found

1. **Check AutomationLog table** for the Chain Run ID
2. **Verify Aigents response** includes Chain Run ID
3. **Check extraction patterns** in `extractChainRunId()`

### Analysis Stuck in "Processing"

1. **Check webhook was received**:
   ```bash
   GET /api/webhooks/aigents
   ```

2. **Query AutomationLog**:
   ```sql
   SELECT * FROM AutomationLog WHERE isCompleted = false;
   ```

3. **Check Aigents dashboard** for chain run status

4. **Manually mark as failed** if needed:
   ```javascript
   await markAutomationLogAsFailed(chainRunId, "Timeout after 5 minutes");
   ```

## Health Check Endpoints

### Webhook Receiver Status

```bash
GET /api/webhooks/aigents
```

Returns:
```json
{
  "message": "Aigents webhook endpoint is active",
  "endpoint": "/api/webhooks/aigents",
  "methods": ["POST", "GET"],
  "stats": {
    "totalAutomations": 150,
    "completed": 145,
    "pending": 5
  },
  "timestamp": "2025-10-10T03:00:00.000Z"
}
```

## Document Type to Chain Mapping

| Document Type | Aigents Chain |
|--------------|---------------|
| PROTOCOL | Protocol analyzer |
| CONSENT_FORM | Consent Form Reviewer |
| ADVERSE_EVENT | Adverse Event Analyzer |
| AMENDMENT | Document Analyzer |
| PROGRESS_REPORT | Document Analyzer |
| APPROVAL_LETTER | Document Analyzer |
| OTHER | Document Analyzer |

To modify this mapping, edit `lib/aigents-webhook.ts`:

```typescript
export function getChainNameForDocumentType(documentType: string): string {
  const chainMap: Record<string, string> = {
    PROTOCOL: 'Protocol analyzer',
    CONSENT_FORM: 'Consent Form Reviewer',
    ADVERSE_EVENT: 'Adverse Event Analyzer',
    // Add your custom mappings here
  };

  return chainMap[documentType] || 'Document Analyzer';
}
```

## Deployment to Vercel

### 1. Database Considerations

SQLite doesn't work well on Vercel (read-only filesystem). Before deploying:

**Option A**: Migrate to PostgreSQL
```bash
# Update schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

# Use Vercel Postgres
# Add connection string to Vercel environment variables
```

**Option B**: Use separate database service (Railway, Supabase, etc.)

### 2. Environment Variables

In Vercel dashboard, add:
```
AIGENTS_API_URL=https://start-chain-run-943506065004.us-central1.run.app
AIGENTS_EMAIL=Mills.reed@mswheart.com
DATABASE_URL=postgresql://...
NEXT_PUBLIC_API_URL=https://your-app.vercel.app
```

### 3. Configure Webhook URL

After deploying to Vercel, update Aigents webhook URL to:
```
https://your-app.vercel.app/api/webhooks/aigents
```

### 4. Webhook Verification (Optional)

For production, add webhook verification:

```typescript
// In /api/webhooks/aigents/route.ts
const webhookSecret = process.env.AIGENTS_WEBHOOK_SECRET;

// Verify signature or shared secret
if (request.headers.get('X-Aigents-Secret') !== webhookSecret) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

## Monitoring and Analytics

### Audit Logs

All webhook events are logged in AuditLog table:

```sql
SELECT * FROM AuditLog
WHERE action IN ('AIGENTS_ANALYSIS_TRIGGERED', 'AIGENTS_WEBHOOK_RECEIVED')
ORDER BY createdAt DESC
LIMIT 50;
```

### Performance Metrics

Track webhook processing time:

```sql
SELECT
  AVG(julianday(agentReceivedAt) - julianday(requestedAt)) * 86400 as avg_seconds,
  COUNT(*) as total
FROM AutomationLog
WHERE isCompleted = true;
```

### Success Rate

```sql
SELECT
  status,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM AutomationLog), 2) as percentage
FROM AutomationLog
GROUP BY status;
```

## Next Steps

1. ✅ Test webhook flow end-to-end
2. ✅ Configure ngrok for local development
3. ✅ Set up all Aigents chains
4. ✅ Test each document type
5. ⏳ Add webhook authentication (optional)
6. ⏳ Migrate to PostgreSQL for Vercel deployment
7. ⏳ Set up monitoring/alerting for failed webhooks

## Support

For issues with this integration:

1. Check server logs for error messages
2. Query AutomationLog table for webhook status
3. Test webhook endpoint with curl
4. Verify Aigents chain configuration
5. Check ngrok tunnel (for local dev)

For Aigents-specific issues, contact the Aigents support team.
