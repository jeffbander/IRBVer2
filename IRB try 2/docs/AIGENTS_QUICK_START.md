# Aigents Integration - Quick Start Guide

## 🚀 30-Second Setup

### Local Development (Mock Mode)

1. **Environment**: Already configured in `.env.example`
   ```bash
   USE_AIGENTS_MOCK="true"
   ```

2. **Start server**:
   ```bash
   npm run dev
   ```

3. **Login**: `pi@example.com` / `password123`

4. **Test workflow**:
   - Create study → Upload document → Send to Aigents → View Analysis ✅

---

## 📋 Common Tasks

### Send Document to Aigents

1. Navigate to study details page
2. Find document in Documents list
3. Click **"Send to Aigents"** button
4. Select AI chain from dropdown
5. Click **"Send to Aigents"**
6. Wait for status badge to show "AI: completed"
7. Click **"View Analysis"**

### Available AI Chains

| Chain Name | Use For | Document Types |
|------------|---------|----------------|
| **Protocol Analyzer** | Research protocols | PROTOCOL |
| **Consent Form Reviewer** | Consent forms | CONSENT_FORM |
| **Adverse Event Analyzer** | Adverse events | ADVERSE_EVENT |
| **Document Analyzer** | Any document | All types |

### Re-analyze Document

1. Find document with "AI: completed" status
2. Click **"Re-analyze"** button
3. Select different chain (optional)
4. Click **"Send to Aigents"**

---

## 🔧 Configuration

### Mock Mode (Development)
```bash
USE_AIGENTS_MOCK="true"
```
- Instant responses
- No API calls
- Perfect for testing

### Production Mode
```bash
USE_AIGENTS_MOCK="false"
AIGENTS_API_URL="https://start-chain-run-943506065004.us-central1.run.app"
AIGENTS_EMAIL="notifications@providerloop.com"
AIGENTS_WEBHOOK_SECRET="your-webhook-secret"
```

Configure webhook in Aigents dashboard:
```
https://your-domain.com/api/webhooks/aigents
```

---

## 📊 Status Indicators

| Badge | Meaning | Action |
|-------|---------|--------|
| 🟡 **AI: pending** | Queued | Wait |
| 🔵 **AI: processing** | Analyzing | Wait for webhook |
| 🟢 **AI: completed** | Done | Click "View Analysis" |
| 🔴 **AI: failed** | Error | Check error, retry |

---

## 🛠️ Troubleshooting

### Button not visible?
- Check user role (must be PI or Reviewer)
- Verify permissions include `review_studies`

### Status stuck on "processing"?
- **Mock mode**: Should complete instantly
- **Production**: Check webhook configuration
- Check Aigents dashboard with Run ID

### Analysis not showing?
- Verify status is "completed"
- Check browser console for errors
- Refresh page

---

## 📁 File Locations

- **Service**: `lib/aigents.ts`
- **API**: `app/api/documents/[documentId]/aigents/route.ts`
- **Webhook**: `app/api/webhooks/aigents/route.ts`
- **UI**: `app/studies/[id]/components/DocumentsList.tsx`
- **Docs**: `docs/AIGENTS_INTEGRATION.md`
- **Tests**: `tests/aigents-integration.spec.ts`

---

## 🧪 Testing

### Run E2E Tests
```bash
npm run test
```

### Run in Headed Mode (see browser)
```bash
npm run test:headed
```

### Test Specific File
```bash
npx playwright test tests/aigents-integration.spec.ts
```

---

## 🔍 API Quick Reference

### Send to Aigents
```bash
POST /api/documents/{documentId}/aigents
Authorization: Bearer {token}

{
  "chainName": "Protocol Analyzer",
  "useMock": true
}
```

### Webhook Health Check
```bash
GET /api/webhooks/aigents
```

Response:
```json
{
  "status": "ok",
  "endpoint": "Aigents Webhook Receiver",
  "timestamp": "2025-10-05T12:00:00.000Z"
}
```

---

## 📖 Full Documentation

For complete details, see:
- **Integration Guide**: `docs/AIGENTS_INTEGRATION.md`
- **Implementation Summary**: `AIGENTS_IMPLEMENTATION_SUMMARY.md`
- **Main README**: `README.md`

---

## ✅ Quick Checklist

**For Development**:
- [x] `USE_AIGENTS_MOCK="true"` in `.env`
- [x] Server running (`npm run dev`)
- [x] Login as PI or Reviewer
- [x] Upload document
- [x] Send to Aigents
- [x] View analysis

**For Production**:
- [ ] `USE_AIGENTS_MOCK="false"` in `.env`
- [ ] Configure AIGENTS_API_URL
- [ ] Configure AIGENTS_EMAIL
- [ ] Configure AIGENTS_WEBHOOK_SECRET
- [ ] Set webhook URL in Aigents dashboard
- [ ] Test end-to-end with real API
- [ ] Monitor webhook logs

---

**Need Help?** Check `docs/AIGENTS_INTEGRATION.md` for detailed troubleshooting.
