# Aigents AI Integration Guide

## Overview

The IRB Management System integrates with **Aigents AI** to provide automated document analysis and insights. This feature allows Principal Investigators (PIs) and Reviewers to send uploaded documents to Aigents for AI-powered analysis, receiving detailed reports on protocol compliance, risk assessment, and actionable recommendations.

## Table of Contents

1. [Features](#features)
2. [Architecture](#architecture)
3. [Setup & Configuration](#setup--configuration)
4. [Usage Guide](#usage-guide)
5. [Available AI Chains](#available-ai-chains)
6. [Webhook Integration](#webhook-integration)
7. [Mock Mode for Development](#mock-mode-for-development)
8. [API Reference](#api-reference)
9. [Troubleshooting](#troubleshooting)

---

## Features

- **Automated Document Analysis**: Send any IRB document to Aigents for AI analysis
- **Multiple Analysis Chains**: Different AI workflows for different document types
- **Real-time Status Tracking**: Monitor analysis progress with status badges
- **Detailed Results Display**: View comprehensive analysis reports in-app
- **Webhook Callbacks**: Receive automatic updates when analysis completes
- **Mock Mode**: Test locally without connecting to Aigents API
- **Audit Logging**: All Aigents interactions are logged for compliance

---

## Architecture

### Components

1. **Frontend UI** (`app/studies/[id]/components/DocumentsList.tsx`)
   - "Send to Aigents" button on each document
   - Chain selection modal
   - Analysis results viewer
   - Status badges (pending, processing, completed, failed)

2. **API Endpoints**
   - `POST /api/documents/[documentId]/aigents` - Send document to Aigents
   - `POST /api/webhooks/aigents` - Receive webhook callbacks
   - `GET /api/webhooks/aigents` - Health check

3. **Service Layer** (`lib/aigents.ts`)
   - `startAigentsChain()` - Initiate analysis
   - `getMockAigentsResponse()` - Generate mock data
   - `getAvailableChainsForDocumentType()` - Filter chains by document type
   - `validateWebhookSignature()` - Security validation

4. **Database Schema** (Prisma)
   - Aigents fields on Document model
   - Audit logs for all operations

### Data Flow

```
User clicks "Send to Aigents"
  ↓
Frontend opens chain selection modal
  ↓
User selects analysis chain
  ↓
POST /api/documents/[id]/aigents
  ↓
System calls Aigents API
  ↓
Document updated (status: processing)
  ↓
Aigents processes document
  ↓
Aigents sends webhook to /api/webhooks/aigents
  ↓
System updates document with results
  ↓
User views analysis in UI
```

---

## Setup & Configuration

### Environment Variables

Add these to your `.env` file:

```bash
# Aigents API Configuration
AIGENTS_API_URL=https://start-chain-run-943506065004.us-central1.run.app
AIGENTS_EMAIL=notifications@providerloop.com
AIGENTS_WEBHOOK_SECRET=your-webhook-secret-here

# Development Mode (optional)
USE_AIGENTS_MOCK=true  # Set to true to use mock responses
```

### Database Migration

The Aigents integration requires database schema updates:

```bash
npx prisma migrate dev --name add_aigents_integration
```

This adds the following fields to the `Document` model:
- `aigentsChainName` - Name of the AI chain used
- `aigentsRunId` - Unique run identifier from Aigents
- `aigentsStatus` - Current status (pending/processing/completed/failed)
- `aigentsAnalysis` - Full analysis text result
- `aigentstartedAt` - Timestamp when analysis started
- `aigentsCompletedAt` - Timestamp when analysis completed
- `aigentsError` - Error message if failed

### Webhook Setup

To receive real-time updates from Aigents:

1. **Configure webhook URL in Aigents dashboard**:
   ```
   https://your-domain.com/api/webhooks/aigents
   ```

2. **Set webhook secret** in `.env`:
   ```
   AIGENTS_WEBHOOK_SECRET=your-secure-secret
   ```

3. **Test webhook endpoint**:
   ```bash
   curl https://your-domain.com/api/webhooks/aigents
   ```

   Expected response:
   ```json
   {
     "status": "ok",
     "endpoint": "Aigents Webhook Receiver",
     "timestamp": "2025-10-05T12:00:00.000Z"
   }
   ```

---

## Usage Guide

### For Users (PIs and Reviewers)

#### 1. Upload a Document

1. Navigate to a study details page
2. Click **"+ Upload"** in the Documents section
3. Fill in document details and select file
4. Click **"Upload"**

#### 2. Send Document to Aigents

1. Locate the uploaded document in the Documents list
2. Click **"Send to Aigents"** button
3. A modal will open showing:
   - Document name and type
   - Available analysis chains
   - Chain description

4. Select the appropriate analysis chain:
   - **Protocol Analyzer** - For research protocols
   - **Consent Form Reviewer** - For consent forms
   - **Adverse Event Analyzer** - For adverse event reports
   - **Document Analyzer** - General purpose for any document

5. Click **"Send to Aigents"**

#### 3. Monitor Analysis Status

The document will show a status badge:
- **AI: pending** - Queued for analysis
- **AI: processing** - Currently being analyzed
- **AI: completed** - Analysis finished successfully
- **AI: failed** - Analysis encountered an error

#### 4. View Analysis Results

1. Once status shows **"AI: completed"**, click **"View Analysis"**
2. A modal displays:
   - Full analysis text
   - Chain name used
   - Run ID for tracking
   - Actionable insights and recommendations

3. Review the findings with your team
4. Download or reference the analysis in study records

#### 5. Re-analyze if Needed

- Click **"Re-analyze"** to send the document through Aigents again
- Useful after document updates or to try different chains

---

## Available AI Chains

### 1. Protocol Analyzer

**Document Types**: `PROTOCOL`

**Description**: Analyzes research protocols and extracts key information, objectives, and requirements

**Example Output**:
```
Protocol Analysis Complete

Key Findings:
- Study Duration: 12 months
- Target Enrollment: 100 participants
- Primary Endpoint: Change in cardiovascular health markers
- Secondary Endpoints: Quality of life measures

Action Items:
- Ensure informed consent includes genetic testing disclosure
- Verify insurance coverage for experimental procedures
- Schedule safety monitoring committee meetings
```

### 2. Consent Form Reviewer

**Document Types**: `CONSENT_FORM`

**Description**: Reviews consent forms for completeness and regulatory compliance

**Example Output**:
```
Consent Form Review Complete

Compliance Check:
- All required elements present ✓
- Language is clear and at appropriate reading level ✓
- Risks and benefits adequately described ✓

Action Items:
- Add contact information for study coordinator
- Clarify compensation structure for participant time
- Update emergency contact procedures
```

### 3. Adverse Event Analyzer

**Document Types**: `ADVERSE_EVENT`

**Description**: Analyzes adverse event reports for severity and required actions

**Example Output**:
```
Adverse Event Analysis

Severity Assessment: Grade 2 (Moderate)

Findings:
- Event appears related to study intervention
- Patient recovered with supportive care
- No permanent sequelae noted

Action Items:
- Report to IRB within 5 business days
- Update safety monitoring report
- Consider protocol modification for similar events
```

### 4. Document Analyzer

**Document Types**: `PROTOCOL`, `CONSENT_FORM`, `AMENDMENT`, `PROGRESS_REPORT`, `OTHER`

**Description**: General document analysis for any IRB-related document

**Example Output**:
```
Analysis of [Document Name]

Document has been processed successfully.

Key Observations:
- [Context-specific findings]

Action Items:
- Review findings with study team
- Update study documentation as needed
- File in study records
```

---

## Webhook Integration

### Webhook Payload Format

Aigents sends POST requests to `/api/webhooks/aigents` with this structure:

```typescript
{
  "run_id": "R_abc123xyz",
  "chain_name": "Protocol Analyzer",
  "status": "completed",  // or "failed", "processing"
  "result": {
    "analysis": "Full analysis text...",
    "actionable_items": [
      "Review findings with study team",
      "Update documentation"
    ],
    "summary": "Analysis completed successfully",
    "metadata": {
      // Additional chain-specific data
    }
  },
  "error": null,  // or error message if failed
  "completed_at": "2025-10-05T12:30:00.000Z"
}
```

### Webhook Security

The webhook endpoint validates incoming requests using HMAC signatures:

```typescript
// Header sent by Aigents
x-aigents-signature: sha256=abc123...

// Validation in route.ts
const signature = request.headers.get('x-aigents-signature');
const isValid = validateWebhookSignature(rawBody, signature, secret);
```

**Note**: In development mode (`NODE_ENV=development`), signature validation is bypassed for testing.

### Webhook Processing

When a webhook is received:

1. Signature is validated (if present)
2. Document is located by `run_id`
3. Document status is updated
4. If completed, analysis text is saved
5. If failed, error message is saved
6. Audit log is created
7. Success response is returned

---

## Mock Mode for Development

### Why Mock Mode?

- Test Aigents integration without API access
- Faster development and testing
- No API quota usage
- Predictable responses

### Enable Mock Mode

**Option 1**: Environment variable
```bash
USE_AIGENTS_MOCK=true
```

**Option 2**: Request parameter
```typescript
fetch('/api/documents/123/aigents', {
  method: 'POST',
  body: JSON.stringify({
    chainName: 'Protocol Analyzer',
    useMock: true  // Override to use mock
  })
})
```

### Mock Response Behavior

When mock mode is enabled:

1. Document is immediately marked as `completed`
2. Mock analysis text is generated based on document type
3. Mock run ID is created: `R_mock_1696512345678`
4. No actual call to Aigents API
5. Response indicates `usedMock: true`

### Mock Analysis Examples

Mock responses are realistic and type-specific. See `lib/aigents.ts` > `getMockAigentsResponse()` for implementation.

---

## API Reference

### POST /api/documents/[documentId]/aigents

Send a document to Aigents for analysis.

**Authentication**: Bearer token required

**Request Body**:
```json
{
  "chainName": "Protocol Analyzer",
  "useMock": false  // optional, defaults to false
}
```

**Response (Success)**:
```json
{
  "success": true,
  "runId": "R_abc123",
  "chainName": "Protocol Analyzer",
  "status": "processing",
  "message": "Document sent to Aigents for analysis"
}
```

**Response (Mock)**:
```json
{
  "success": true,
  "runId": "R_mock_1696512345678",
  "chainName": "Protocol Analyzer",
  "status": "completed",
  "usedMock": true,
  "message": "Document processed with mock Aigents response"
}
```

**Error Responses**:
- `400` - Missing chain name or invalid document ID
- `404` - Document not found
- `500` - Aigents API error

---

### POST /api/webhooks/aigents

Receive webhook callbacks from Aigents.

**Authentication**: Signature validation (x-aigents-signature header)

**Request Body**: See [Webhook Payload Format](#webhook-payload-format)

**Response**:
```json
{
  "success": true,
  "documentId": "cm123abc",
  "status": "completed",
  "message": "Webhook processed successfully"
}
```

**Error Responses**:
- `400` - Invalid JSON payload
- `401` - Invalid signature
- `404` - Document not found for run ID
- `500` - Internal server error

---

### GET /api/webhooks/aigents

Health check endpoint.

**Authentication**: None

**Response**:
```json
{
  "status": "ok",
  "endpoint": "Aigents Webhook Receiver",
  "timestamp": "2025-10-05T12:00:00.000Z"
}
```

---

## Troubleshooting

### Document Status Stuck on "Processing"

**Cause**: Webhook not received or Aigents processing delay

**Solutions**:
1. Check Aigents dashboard for run status
2. Verify webhook URL is configured correctly
3. Check webhook endpoint logs for errors
4. Contact Aigents support with Run ID

### "Send to Aigents" Button Not Visible

**Cause**: User doesn't have required permissions

**Solutions**:
1. Verify user has PI or Reviewer role
2. Check role permissions include `review_studies`
3. Refresh page after role changes

### Webhook Signature Validation Fails

**Cause**: Mismatched webhook secret

**Solutions**:
1. Verify `AIGENTS_WEBHOOK_SECRET` matches Aigents configuration
2. Check for whitespace in environment variable
3. Temporarily disable validation in development

### No Analysis Chains Available

**Cause**: Document type not supported by any chain

**Solutions**:
1. Use "Document Analyzer" (supports all types)
2. Update document type to match chain requirements
3. Add new chain configuration in `lib/aigents.ts`

### API Error: "Failed to send to Aigents"

**Cause**: Network error or Aigents API unavailable

**Solutions**:
1. Check `AIGENTS_API_URL` environment variable
2. Verify network connectivity
3. Enable mock mode for testing: `USE_AIGENTS_MOCK=true`
4. Check Aigents API status

### Mock Responses in Production

**Cause**: Mock mode accidentally enabled

**Solutions**:
1. Check `USE_AIGENTS_MOCK` is not set or set to `false`
2. Verify `.env` file doesn't have mock mode enabled
3. Check frontend is not sending `useMock: true`

---

## Audit Trail

All Aigents operations are logged in the audit log:

**Actions Logged**:
- `SEND_TO_AIGENTS` - Document sent to Aigents (real)
- `SEND_TO_AIGENTS_MOCK` - Document sent to Aigents (mock)
- `AIGENTS_WEBHOOK_RECEIVED` - Webhook callback received

**Access Audit Logs**:
```
GET /api/audit-logs?entity=Document&entityId=[documentId]
```

Each log entry includes:
- User who initiated action
- Timestamp
- Document ID and name
- Chain name
- Run ID
- Status
- Whether mock was used

---

## Best Practices

### 1. Choose the Right Chain

- Use specific chains when available (Protocol Analyzer, Consent Form Reviewer)
- Fall back to Document Analyzer for general analysis
- Consider document type when selecting chain

### 2. Review Analysis Promptly

- Check status badges regularly
- Review completed analyses within 24 hours
- Act on actionable items quickly

### 3. Document Your Workflow

- Note analysis findings in study records
- Reference Run ID in communications
- Keep analysis reports with document versions

### 4. Handle Errors Gracefully

- If analysis fails, review error message
- Re-analyze after fixing document issues
- Contact support for persistent failures

### 5. Security

- Keep webhook secret confidential
- Monitor audit logs for unauthorized access
- Report suspicious activity immediately

---

## Future Enhancements

Planned improvements:

- [ ] Custom chain creation
- [ ] Batch document analysis
- [ ] Analysis comparison tool
- [ ] Export analysis reports (PDF)
- [ ] Email notifications when analysis completes
- [ ] Integration with study milestones
- [ ] Advanced filtering by chain type
- [ ] Analysis history timeline

---

## Support

For questions or issues:

- **Technical Support**: Check logs in `/api/audit-logs`
- **Aigents API Issues**: Contact Aigents support with Run ID
- **Feature Requests**: Submit via project issue tracker

---

**Last Updated**: October 5, 2025
**Version**: 1.0.0
