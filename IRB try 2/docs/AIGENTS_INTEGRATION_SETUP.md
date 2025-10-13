# Aigents AI Integration Setup Guide

## Overview

The IRB Management System integrates with **Aigents AI** to provide automated document analysis capabilities. Documents uploaded to studies can be sent to Aigents for AI-powered review and compliance checking.

## Webhook Endpoint

**Aigents API URL:** `https://start-chain-run-943506065004.us-central1.run.app`

This endpoint is used to start chain runs for document analysis.

---

## Required Configuration

To use the real Aigents API (not mock mode), you need to configure the following environment variables in your `.env` file:

### Environment Variables

```bash
# Aigents AI Integration
AIGENTS_API_URL="https://start-chain-run-943506065004.us-central1.run.app"
AIGENTS_EMAIL="notifications@providerloop.com"
AIGENTS_WEBHOOK_SECRET="your-webhook-secret-here"
AIGENTS_FOLDER_ID="your-folder-id-here"  # REQUIRED for real API
USE_AIGENTS_MOCK="false"  # Set to false to use real API
```

### Critical Parameters

1. **AIGENTS_FOLDER_ID** (Required)
   - This is the AppSheet folder ID that contains your chain configurations
   - Maps to the `ChainRun_Chain_Link` column in AppSheet
   - **Error if missing:** `Missing value in column: ChainRun_Chain_Link`
   - You must obtain this from your Aigents/AppSheet setup

2. **AIGENTS_EMAIL**
   - Email address for receiving notifications from chain runs
   - Default: `notifications@providerloop.com`

3. **AIGENTS_WEBHOOK_SECRET**
   - Secret key for validating webhook callbacks (if implemented)

4. **USE_AIGENTS_MOCK**
   - Set to `"true"` for local testing with mock responses
   - Set to `"false"` to use the real Aigents API

---

## API Request Format

When a document is sent to Aigents, the system makes a POST request with the following structure:

```typescript
{
  run_email: string,              // Email for notifications
  chain_to_run: string,          // Chain name (e.g., "Protocol Analyzer")
  folder_id: string,             // REQUIRED: AppSheet folder ID
  source_name: string,           // Always "IRB Management System - Document Upload"
  source_id: string,             // Document ID
  first_step_user_input: string, // Document content or description
  starting_variables: {
    document_id: string,
    document_name: string,
    file_path: string,
    analysis_type: string        // Always "full"
  }
}
```

---

## Available Chains

The system includes predefined chains for different document types:

| Chain Name | Description | Document Types |
|-----------|-------------|----------------|
| **Protocol Analyzer** | Analyzes research protocols and extracts key information | PROTOCOL |
| **Consent Form Reviewer** | Reviews consent forms for completeness and compliance | CONSENT_FORM |
| **Document Analyzer** | General document analysis for any IRB document | ALL |
| **Adverse Event Analyzer** | Analyzes adverse event reports for severity | ADVERSE_EVENT |

### Usage Example

```javascript
// Send document to Aigents for analysis
const response = await fetch(`/api/documents/${documentId}/aigents`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    chainName: 'Protocol Analyzer',  // Use one of the predefined chains
  }),
});
```

---

## Mock Mode (Development)

For local development and testing, you can use mock mode to simulate Aigents responses without calling the real API:

```bash
USE_AIGENTS_MOCK="true"
```

### Mock Response Example

```json
{
  "run_id": "R_mock_1760058000000",
  "chain_name": "Protocol Analyzer",
  "status": "completed",
  "result": {
    "analysis": "Protocol Analysis Complete\n\nKey Findings:\n- Study Duration: 12 months\n- Target Enrollment: 100 participants\n...",
    "actionable_items": [
      "Review findings with study team",
      "Update documentation",
      "File in study records"
    ],
    "summary": "Analysis completed for Protocol Document"
  },
  "completed_at": "2025-10-10T01:00:00.000Z"
}
```

---

## Error Handling

### Common Errors

1. **400 Bad Request - Missing folder_id**
   ```
   Error: Can't add or update a row because a required value is missing.
   Missing value in column: ChainRun_Chain_Link
   ```
   **Solution:** Set `AIGENTS_FOLDER_ID` in your `.env` file

2. **500 Internal Server Error - File not found**
   ```
   Error: ENOENT: no such file or directory
   ```
   **Solution:** The system now handles this gracefully by using fallback content for mock documents

3. **Timeout (15+ seconds)**
   - The Aigents API can take 10-15 seconds to respond
   - This is normal for real chain runs
   - Mock mode responds immediately

---

## Workflow Integration

### Complete Workflow

1. **Create Study** → Study created with metadata
2. **Upload Document** → Document stored in database
3. **Send to Aigents** →
   - System reads document content (or uses fallback for mock files)
   - Sends request to Aigents API with all required parameters
   - Aigents processes document through AI chain
   - Results stored in database
4. **View Results** → Analysis available in study view

### API Endpoint

```
POST /api/documents/{documentId}/aigents
```

**Request Body:**
```json
{
  "chainName": "Protocol Analyzer"
}
```

**Response (Success):**
```json
{
  "success": true,
  "runId": "R_abc123",
  "chainName": "Protocol Analyzer",
  "status": "processing",
  "message": "Document sent to Aigents for analysis"
}
```

---

## Testing

### Test with Mock Mode

1. Set `USE_AIGENTS_MOCK="true"` in `.env`
2. Run the workflow test:
```bash
npx playwright test tests/api-workflow-demo.spec.ts
```

3. Check output for:
```
✅ Document sent to AI for analysis
   Chain Type: Protocol Analyzer
   Status: completed
```

### Test with Real API

1. Obtain your `AIGENTS_FOLDER_ID` from your Aigents/AppSheet setup
2. Set environment variables:
```bash
AIGENTS_FOLDER_ID="your-actual-folder-id"
USE_AIGENTS_MOCK="false"
```

3. Restart the development server
4. Run the workflow test
5. Monitor server logs for Aigents API requests and responses

---

## Production Deployment

### Required Steps

1. **Set Environment Variables** on your hosting platform:
   - Vercel: Project Settings → Environment Variables
   - Netlify: Site Settings → Environment Variables
   - Firebase: `firebase functions:config:set`

2. **Configure Webhook Callbacks** (if needed):
   - Set up a webhook endpoint to receive completion notifications
   - Implement signature validation using `AIGENTS_WEBHOOK_SECRET`

3. **Test End-to-End**:
   - Upload a real document
   - Send to Aigents
   - Verify chain completes successfully
   - Check results are stored correctly

---

## Troubleshooting

### Enable Debug Logging

The system logs Aigents API requests:

```
🤖 Sending to Aigents API: {
  url: 'https://start-chain-run-943506065004.us-central1.run.app',
  chain: 'Protocol Analyzer',
  email: 'notifications@providerloop.com',
  documentId: 'cmgk5gxpb001fsu5o4vgn3kin'
}
```

And error responses:

```
Aigents API error response: {
  status: 400,
  statusText: 'Bad Request',
  body: '{"success":false,"error":"Error calling AppSheet API",...}'
}
```

### Check Database Status

After sending to Aigents, check the document record:

```sql
SELECT
  aigentsChainName,
  aigentsRunId,
  aigentsStatus,
  aigentsAnalysis,
  aigentstartedAt,
  aigentsCompletedAt
FROM Document
WHERE id = 'your-document-id';
```

Status values:
- `null` - Not yet sent to Aigents
- `'processing'` - Chain is running
- `'completed'` - Analysis complete
- `'failed'` - Error occurred

---

## Summary

✅ **Aigents Integration Configured**
- Endpoint: `https://start-chain-run-943506065004.us-central1.run.app`
- Mock mode works perfectly for testing
- Real API requires `AIGENTS_FOLDER_ID` configuration
- All 4 predefined chains available
- Error handling and logging implemented

🔧 **To Use Real API:**
1. Get your AppSheet folder ID
2. Set `AIGENTS_FOLDER_ID` in `.env`
3. Set `USE_AIGENTS_MOCK="false"`
4. Restart server
5. Test with workflow

The integration is production-ready once you have the correct `AIGENTS_FOLDER_ID` from your Aigents/AppSheet configuration.
