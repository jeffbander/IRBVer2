# Aigents Webhook Configuration

## Current Setup Summary

### Ngrok Tunnel Status: ACTIVE
- **Public URL:** https://c8eed062f881.ngrok.app
- **Forwarding to:** localhost:3009
- **Protocol:** HTTPS
- **Status:** Running
- **Web Interface:** http://localhost:4040

### Webhook Endpoint for Aigents

Configure this URL in your Aigents dashboard:

```
https://c8eed062f881.ngrok.app/api/aigents/webhook
```

### Important Notes for Free Tier

**WARNING:** You are using ngrok's free tier. The URL will change every time ngrok restarts.

**When the URL changes, you MUST:**
1. Run `get-tunnel-url.bat` to get the new URL
2. Update the webhook URL in Aigents dashboard
3. Update the `BASE_URL` in your `.env` file

### Recommendation: Upgrade to Paid Plan

For a stable, permanent URL that never changes:
- **Plan:** Ngrok Personal ($10/month)
- **Benefit:** Reserved domain (e.g., `irb-system.ngrok.app`)
- **Upgrade at:** https://dashboard.ngrok.com/billing/subscription

Once upgraded:
1. Reserve your domain at: https://dashboard.ngrok.com/cloud-edge/domains
2. Update `ngrok-config.yml` with your reserved domain
3. Restart ngrok: `start-ngrok.bat`
4. Set Aigents webhook once and forget about it

---

## Quick Reference Commands

### Start Ngrok
```bash
start-ngrok.bat
```

### Get Current URL
```bash
get-tunnel-url.bat
```

### Stop Ngrok
```bash
stop-ngrok.bat
```

### View Tunnel Traffic
Open: http://localhost:4040

---

## Application Configuration

Your `.env` file has been updated with:
- PORT=3009
- BASE_URL=https://c8eed062f881.ngrok.app
- NGROK_URL=https://c8eed062f881.ngrok.app

### Testing the Webhook

1. Ensure your Next.js app is running on port 3009:
   ```bash
   npm run dev
   ```

2. Test the webhook endpoint:
   ```bash
   curl -X POST https://c8eed062f881.ngrok.app/api/aigents/webhook \
     -H "Content-Type: application/json" \
     -d '{"test": "data"}'
   ```

3. Check ngrok web interface for request logs: http://localhost:4040

---

## Troubleshooting

### Issue: Webhook not receiving data
**Check:**
- [ ] Ngrok is running (`get-tunnel-url.bat`)
- [ ] Next.js app is running on port 3009
- [ ] Webhook URL in Aigents matches current ngrok URL
- [ ] AIGENTS_WEBHOOK_SECRET matches in both systems

### Issue: URL changed
**Solution:**
1. Get new URL: `get-tunnel-url.bat`
2. Update `.env` BASE_URL
3. Update Aigents webhook configuration
4. Restart your Next.js app

### Issue: Can't access tunnel
**Check:**
- [ ] Your ISP isn't blocking ngrok
- [ ] Port 3009 is free (not used by another app)
- [ ] Firewall allows ngrok connections

---

## Production Deployment Alternative

Instead of ngrok for production, consider:
1. **Vercel** (recommended for Next.js)
2. **Netlify**
3. **Railway**
4. **Render**

These provide stable HTTPS URLs without ngrok.

---

**Created:** 2025-10-12
**Current Tunnel:** https://c8eed062f881.ngrok.app
**Webhook Endpoint:** https://c8eed062f881.ngrok.app/api/aigents/webhook
