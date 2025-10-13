# Aigents Webhook Configuration with Ngrok

## Current Setup

Your IRB Management System is now accessible via ngrok and ready to receive webhooks from Aigents!

### URLs

**Webhook Endpoint (Configure in Aigents):**
```
https://7a42f175c798.ngrok.app/api/webhooks/aigents
```

**Local Testing:**
```
http://localhost:3009/api/webhooks/aigents
```

**Ngrok Dashboard:**
```
http://127.0.0.1:4040
```

---

## Configure in Aigents Dashboard

### Step 1: Go to Aigents Chain Settings

1. Log into your Aigents account
2. Open the chain you want to configure (e.g., "Protocol analyzer", "Document Analyzer")
3. Go to **Settings** or **Webhooks** section

### Step 2: Add Webhook URL

Configure the webhook with:

```
URL: https://7a42f175c798.ngrok.app/api/webhooks/aigents
Method: POST
Content-Type: application/json
```

### Step 3: Configure Payload Fields

Ensure your Aigents chain sends these fields in the webhook:

**Required:**
- `chain_run_id` or `run_id` or `Chain Run ID` - The unique ID for this chain run

**Recommended:**
- `agentResponse` or `summ` or `Final_Output` - The analysis result
- `status` - "completed" or "failed"
- `error` - Error message if status is "failed"

**Example Payload:**
```json
{
  "chain_run_id": "R_abc123def456",
  "status": "completed",
  "agentResponse": "Protocol Analysis Complete\n\nKey Findings:\n- Study Duration: 12 months\n...",
  "completed_at": "2025-10-12T18:30:00Z"
}
```

---

## Testing Your Webhook

### Test 1: Health Check (GET)

```bash
curl https://7a42f175c798.ngrok.app/api/webhooks/aigents
```

Expected response:
```json
{
  "message": "Aigents webhook endpoint is active",
  "endpoint": "/api/webhooks/aigents",
  "methods": ["POST", "GET"],
  "stats": {
    "totalAutomations": 0,
    "completed": 0,
    "pending": 0
  }
}
```

### Test 2: Mock Webhook (POST)

```bash
curl -X POST https://7a42f175c798.ngrok.app/api/webhooks/aigents \
  -H "Content-Type: application/json" \
  -d '{
    "chain_run_id": "R_test123",
    "status": "completed",
    "agentResponse": "Test analysis completed successfully"
  }'
```

### Test 3: Monitor in Ngrok Dashboard

1. Open `http://127.0.0.1:4040`
2. Send a test webhook
3. See the request/response in real-time
4. Replay requests as needed

---

## How It Works

### Outbound Flow (IRB → Aigents)

1. User uploads document to study
2. User clicks "Send to Aigents"
3. IRB app calls Aigents API to trigger chain
4. Aigents returns **Chain Run ID**
5. IRB app creates `AutomationLog` with Chain Run ID
6. Status: "processing"

### Inbound Flow (Aigents → IRB via Webhook)

1. Aigents completes processing (15-25 seconds)
2. Aigents sends webhook to: `https://7a42f175c798.ngrok.app/api/webhooks/aigents`
3. Webhook includes Chain Run ID
4. IRB app matches Chain Run ID → AutomationLog
5. IRB app updates Document with AI analysis
6. Status: "completed"
7. User clicks "View Analysis"

---

## Environment Variables

Your `.env` should include:

```bash
# Aigents Configuration
AIGENTS_API_URL="https://start-chain-run-943506065004.us-central1.run.app"
AIGENTS_EMAIL="Mills.reed@mswheart.com"
USE_AIGENTS_MOCK="false"  # Set to true for local testing without API

# Database (already configured)
DATABASE_URL="your-database-url"
```

---

## Webhook Security (Production)

For production deployment, add these security measures:

### 1. Webhook Secret

In `.env`:
```bash
AIGENTS_WEBHOOK_SECRET="your-secret-key-here"
```

In Aigents dashboard:
- Configure webhook signature
- Use HMAC-SHA256

### 2. IP Whitelisting

If Aigents has a static IP, whitelist it in your firewall.

### 3. HTTPS Only

Your ngrok URL already uses HTTPS ✅

---

## Monitoring & Debugging

### View Webhook Logs

Check your terminal running `npm run dev` for:

```
🎣 Webhook received from Aigents
📦 Webhook payload keys: ['chain_run_id', 'status', 'agentResponse']
🔗 Chain Run ID: R_abc123def456
✅ Found automation log: { id: 1, chainName: 'Protocol analyzer' }
📄 Agent response extracted: Protocol Analysis Complete...
✅ Automation log updated
✅ Document updated with AI analysis
✅ Webhook processed successfully in 125ms
```

### View in Ngrok Dashboard

1. Visit `http://127.0.0.1:4040`
2. See all webhook requests
3. Inspect request/response bodies
4. Replay requests for testing

### Check Database

```sql
-- View automation logs
SELECT * FROM "AutomationLog"
WHERE "isCompleted" = false
ORDER BY "triggeredAt" DESC;

-- View documents with AI analysis
SELECT id, name, "aigentsStatus", "aigentsAnalysis"
FROM "Document"
WHERE "aigentsStatus" IS NOT NULL
ORDER BY "aigentsCompletedAt" DESC;
```

---

## Important Notes

### Ngrok URL Changes

⚠️ **The current ngrok URL will change** when you restart ngrok.

Current URL: `https://7a42f175c798.ngrok.app`

**Options:**

1. **Use this URL for testing**: Just update Aigents webhook settings when it changes
2. **Get a reserved domain**: Visit https://dashboard.ngrok.com/domains to reserve a permanent URL like `irb-providerloop.ngrok.app`

### Running Both Tunnels

Since your account has a 1-session limit, you can't run separate tunnels for IRB and HeartVoice simultaneously. Options:

1. **Switch between apps**: Stop one tunnel, start the other
2. **Run all tunnels from one session**: Use `npm run tunnel` (starts IRB + HeartVoice + Main)
3. **Upgrade ngrok plan**: Remove session limit

---

## Quick Commands

```bash
# Start IRB app
npm run dev -- -p 3009

# Start ngrok tunnel (in another terminal)
"$LOCALAPPDATA/ngrok/ngrok.exe" start irb --config ngrok.yml

# Test webhook health
curl http://localhost:3009/api/webhooks/aigents

# Test via ngrok
curl https://7a42f175c798.ngrok.app/api/webhooks/aigents

# View ngrok dashboard
open http://127.0.0.1:4040
```

---

## Workflow Example

### Complete End-to-End Flow

1. **User uploads protocol document**
   - Document ID: `doc_123`
   - Study ID: `study_456`

2. **User clicks "Send to Aigents"**
   - POST to `/api/documents/doc_123/aigents`
   - IRB triggers Aigents "Protocol analyzer" chain
   - Aigents returns Chain Run ID: `R_abc789`

3. **IRB creates AutomationLog**
   - Chain Run ID: `R_abc789`
   - Status: "processing"
   - Document ID: `doc_123`

4. **Aigents processes (15-25 seconds)**
   - Analyzes protocol
   - Extracts key information

5. **Aigents sends webhook**
   - POST to `https://7a42f175c798.ngrok.app/api/webhooks/aigents`
   - Payload includes `chain_run_id: R_abc789`

6. **IRB receives webhook**
   - Matches Chain Run ID → AutomationLog
   - Extracts analysis from webhook
   - Updates Document with AI analysis
   - Updates AutomationLog: status = "completed"

7. **User views analysis**
   - Clicks "View Analysis"
   - Sees AI-generated protocol analysis

---

## Troubleshooting

### Webhook not received?

1. Check Aigents webhook configuration
2. Verify URL: `https://7a42f175c798.ngrok.app/api/webhooks/aigents`
3. Check ngrok dashboard for incoming requests
4. Check IRB app logs for webhook processing

### Chain Run ID not matching?

1. Check Aigents payload field names
2. Verify webhook includes `chain_run_id` or similar
3. Check logs for "No Chain Run ID found" errors

### Analysis not showing?

1. Verify webhook status is "completed"
2. Check Document.aigentsAnalysis field in database
3. Ensure user has permissions to view analysis

---

## Summary

✅ **Webhook URL**: `https://7a42f175c798.ngrok.app/api/webhooks/aigents`
✅ **Health Check**: Working (`GET /api/webhooks/aigents`)
✅ **Monitoring**: Available at `http://127.0.0.1:4040`
✅ **Ready for Aigents configuration**

Configure this webhook URL in your Aigents chains and you're ready to go! 🚀
