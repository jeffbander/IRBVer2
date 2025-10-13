# Ngrok Tunnel Setup for IRB Management System

## Current Status

Your ngrok tunnel is now running and configured for port 3009.

### Current Tunnel URL
Check your active tunnel URL by running:
```bash
get-tunnel-url.bat
```

Or visit: http://localhost:4040

## Quick Start Commands

### Start Ngrok Tunnel
```bash
start-ngrok.bat
```
This will:
- Kill any old ngrok processes
- Start a new tunnel on port 3009
- Display the public URL
- Open the ngrok web interface

### Stop Ngrok Tunnel
```bash
stop-ngrok.bat
```

### Get Current URL
```bash
get-tunnel-url.bat
```

## Account Type: Free Tier

You are currently on ngrok's **Free tier**. This means:

### Free Tier Features:
- Random URL that changes on restart (e.g., https://abc123def.ngrok.app)
- 1 online ngrok process
- 40 connections/minute
- HTTPS tunnels included
- Works great for development and testing

### Free Tier Limitations:
- **URL changes every time ngrok restarts** (this is the main issue)
- Cannot use custom domains
- Limited to 1 tunnel at a time

## Solution for Stable URLs

### Option 1: Ngrok Personal Plan ($10/month) - RECOMMENDED
**Benefits:**
- **Static domain** (e.g., your-app.ngrok.app) that never changes
- 3 reserved domains
- 3 online ngrok processes
- No connection limits
- Perfect for webhook integrations like Aigents

**To Upgrade:**
1. Visit: https://dashboard.ngrok.com/billing/subscription
2. Select "Personal" plan
3. Once upgraded, you can reserve a static domain:
   - Go to: https://dashboard.ngrok.com/cloud-edge/domains
   - Click "New Domain" or "Claim" a subdomain
   - Copy your reserved domain (e.g., `irb-system.ngrok.app`)
4. Update `ngrok-config.yml`:
   ```yaml
   tunnels:
     irb-app:
       proto: http
       addr: 3009
       domain: irb-system.ngrok.app  # Add this line with YOUR domain
   ```
5. Restart ngrok using `start-ngrok.bat`

### Option 2: Use Current Free Tier (Requires Manual Updates)
If you want to continue with the free tier:

**Pros:**
- No cost
- Works for testing

**Cons:**
- URL changes on every restart
- You must update the webhook URL in Aigents dashboard every time
- Not reliable for production use

**Workflow:**
1. Start ngrok: `start-ngrok.bat`
2. Get URL: `get-tunnel-url.bat`
3. Copy the URL (e.g., `https://c8eed062f881.ngrok.app`)
4. Update Aigents webhook configuration with new URL
5. Repeat these steps whenever ngrok restarts

### Option 3: Custom Domain (Requires ngrok Pro/Enterprise)
For production use with your own domain:
- Requires ngrok Pro plan ($20/month) or Enterprise
- Use your own domain (e.g., webhooks.yourdomain.com)
- Full SSL/TLS support
- Best for production applications

## Webhook Configuration for Aigents

Once you have a stable URL (either by upgrading or using current free URL), configure Aigents:

### Webhook Endpoint for Aigents:
```
{NGROK_URL}/api/aigents/webhook
```

Example with current tunnel:
```
https://c8eed062f881.ngrok.app/api/aigents/webhook
```

### Update Your .env File:
```env
# Add your ngrok base URL
BASE_URL="https://your-ngrok-url.ngrok.app"

# Update Aigents webhook secret if needed
AIGENTS_WEBHOOK_SECRET="your-webhook-secret-here"
```

## Troubleshooting

### Ngrok Not Starting
```bash
# Kill all ngrok processes
taskkill /F /IM ngrok.exe

# Wait a few seconds
timeout /t 3

# Start again
start-ngrok.bat
```

### Port 3009 Already in Use
```bash
# Check what's using port 3009
netstat -ano | findstr :3009

# Kill the process (replace PID with actual process ID)
taskkill /F /PID <PID>
```

### Can't Access Ngrok Web Interface
- Make sure ngrok is running
- Visit: http://localhost:4040
- If port 4040 is in use, ngrok will use a different port (check console output)

### Tunnel URL Changed
This is expected on free tier. You need to:
1. Get new URL: `get-tunnel-url.bat`
2. Update Aigents webhook configuration
3. Update any hardcoded URLs in your application

## Security Best Practices

### 1. Webhook Secret Validation
Your application already validates webhook secrets. Keep this secure in `.env`:
```env
AIGENTS_WEBHOOK_SECRET="use-a-long-random-string-here"
```

### 2. Ngrok Authentication (Optional)
Add basic auth to ngrok tunnel:
```yaml
tunnels:
  irb-app:
    proto: http
    addr: 3009
    auth: "username:password"
```

### 3. IP Allowlisting (Paid Plans Only)
Restrict tunnel access to specific IPs:
```yaml
tunnels:
  irb-app:
    proto: http
    addr: 3009
    ip_restriction:
      allow_cidrs:
        - "1.2.3.4/32"  # Aigents server IP
```

## Next Steps

1. **For Development/Testing:**
   - Use current free tunnel
   - Remember to update Aigents webhook when URL changes
   - Consider upgrading if URL changes become inconvenient

2. **For Production:**
   - Upgrade to ngrok Personal plan ($10/month)
   - Reserve a static domain
   - Update ngrok-config.yml with your domain
   - Configure Aigents webhook once with stable URL
   - Never worry about URL changes again

3. **Alternative: Deploy to Cloud**
   - Deploy your app to Vercel, Netlify, or similar
   - Use their stable URLs for webhooks
   - No need for ngrok in production

## Files Created

- `ngrok-config.yml` - Ngrok configuration file
- `start-ngrok.bat` - Start tunnel script
- `stop-ngrok.bat` - Stop tunnel script
- `get-tunnel-url.bat` - Get current URL script
- `NGROK-SETUP.md` - This documentation file

## Support

- Ngrok Documentation: https://ngrok.com/docs
- Ngrok Dashboard: https://dashboard.ngrok.com
- Pricing: https://ngrok.com/pricing
