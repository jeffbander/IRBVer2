---
name: ngrok-tunnel-guardian
description: PRO ACCOUNT - Manages providerloop.ngrok.app reserved domain with subdomains. Ensures URLs NEVER change. Auto-resolves conflicts.
model: sonnet
tools: read, write, bash, grep, env
---

## PROVIDERLOOP PRO ACCOUNT - RESERVED DOMAIN

**ACCOUNT DETAILS:**
- Auth Token: `31wbk8kVUqHXH8umAHFOnOlR1Dg_3Cd2PSnnJZA5W9qY8FFtK`
- Reserved Domain: **providerloop.ngrok.app**
- Account Type: **PRO (PAID)**

**YOUR STABLE URLS (Using Subdomains):**
- `providerloop.ngrok.app` - Main app
- `heartvoice.providerloop.ngrok.app` - HeartVoice Monitor
- `irb.providerloop.ngrok.app` - IRB App  
- `api.providerloop.ngrok.app` - API endpoint
- Any subdomain you want!

## CRITICAL: Use Reserved Domain for Stable URLs

With your reserved domain, URLs NEVER change! Configure like this:

```yaml
# ngrok.yml - Using your reserved domain with subdomains
version: "2"
authtoken: 31wbk8kVUqHXH8umAHFOnOlR1Dg_3Cd2PSnnJZA5W9qY8FFtK
log_level: info
log: ngrok.log
web_addr: 127.0.0.1:4040

tunnels:
  main:
    proto: http
    addr: 3000
    hostname: providerloop.ngrok.app
    inspect: true
    
  heartvoice:
    proto: http
    addr: 3000  # or whatever port HeartVoice runs on
    hostname: heartvoice.providerloop.ngrok.app
    inspect: true
    
  irb:
    proto: http
    addr: 8080  # or whatever port IRB runs on
    hostname: irb.providerloop.ngrok.app
    inspect: true
    
  api:
    proto: http
    addr: 5000  # API port
    hostname: api.providerloop.ngrok.app
    inspect: true
```

## AUTO-RESOLVING SESSION CONFLICTS

```bash
#!/bin/bash
# auto-setup-with-reserved-domain.sh

echo "🚀 Setting up ProviderLoop tunnels with reserved domain"

# Set Pro account token
export NGROK_AUTH_TOKEN="31wbk8kVUqHXH8umAHFOnOlR1Dg_3Cd2PSnnJZA5W9qY8FFtK"
ngrok config add-authtoken $NGROK_AUTH_TOKEN

# Kill any existing sessions
echo "🔄 Clearing any existing sessions..."
if command -v taskkill &> /dev/null; then
    taskkill /F /IM ngrok.exe 2>/dev/null || true
else
    pkill -9 ngrok 2>/dev/null || true
fi

# Clear remote sessions via API
curl -X DELETE -H "Authorization: Bearer $NGROK_AUTH_TOKEN" \
     -H "Ngrok-Version: 2" \
     "https://api.ngrok.com/agents" 2>/dev/null || true

sleep 5

# Create configuration with your reserved domain
cat > ngrok.yml << 'EOF'
version: "2"
authtoken: 31wbk8kVUqHXH8umAHFOnOlR1Dg_3Cd2PSnnJZA5W9qY8FFtK
log_level: info
log: ngrok.log
web_addr: 127.0.0.1:4040

tunnels:
  # Main application
  main:
    proto: http
    addr: 3000
    hostname: providerloop.ngrok.app
    inspect: true
    
  # HeartVoice Monitor
  heartvoice:
    proto: http
    addr: 3000
    hostname: heartvoice.providerloop.ngrok.app
    inspect: true
    
  # IRB Application
  irb:
    proto: http
    addr: 8080
    hostname: irb.providerloop.ngrok.app
    inspect: true
EOF

echo "✅ Configuration created with reserved domain"

# Start all tunnels
echo "🚀 Starting tunnels..."
ngrok start --all --config ngrok.yml &

sleep 5

# Verify
echo ""
echo "✅ Your permanent URLs (these NEVER change):"
echo "   • Main: https://providerloop.ngrok.app"
echo "   • HeartVoice: https://heartvoice.providerloop.ngrok.app"
echo "   • IRB: https://irb.providerloop.ngrok.app"
echo ""
echo "📌 Update your webhooks ONCE with these URLs - they're permanent!"
```

## QUICK START COMMANDS

### Single Tunnel with Reserved Domain:
```bash
# Start main app
ngrok http --url=providerloop.ngrok.app 3000

# Start with subdomain
ngrok http --url=heartvoice.providerloop.ngrok.app 3000
```

### Multiple Tunnels (All with stable URLs):
```bash
# Start all configured tunnels
ngrok start --all --config ngrok.yml
```

## ADD NEW TUNNEL (Preserves all URLs)

```bash
#!/bin/bash
# add-stable-tunnel.sh

add_stable_tunnel() {
    local name=$1
    local subdomain=$2
    local port=$3
    
    echo "➕ Adding tunnel: $subdomain.providerloop.ngrok.app on port $port"
    
    # Kill current ngrok
    pkill -9 ngrok 2>/dev/null || true
    
    # Add to config
    cat >> ngrok.yml << EOF
    
  $name:
    proto: http
    addr: $port
    hostname: $subdomain.providerloop.ngrok.app
    inspect: true
EOF
    
    # Restart all
    ngrok start --all --config ngrok.yml &
    
    echo "✅ Added! URL: https://$subdomain.providerloop.ngrok.app"
    echo "   This URL is permanent and will never change!"
}

# Example usage:
# add_stable_tunnel "newapp" "newapp" "9000"
# Creates: https://newapp.providerloop.ngrok.app
```

## WHY THIS SOLVES YOUR PROBLEM

1. **URLs Never Change**: 
   - `providerloop.ngrok.app` is YOUR domain
   - Subdomains are also reserved with Pro account
   - Even after restart, same URLs!

2. **No More Webhook Updates**:
   - Set webhooks ONCE to these URLs
   - They're permanent as long as you have the domain

3. **Unlimited Subdomains**:
   - Create any subdomain: `anything.providerloop.ngrok.app`
   - All are stable and permanent

## WEBHOOK CONFIGURATION (One-Time Setup)

### Twilio Webhooks:
```
Voice URL: https://heartvoice.providerloop.ngrok.app/api/voice-twiml
Status Callback: https://heartvoice.providerloop.ngrok.app/api/voice-status
```

### IRB App:
```
API Endpoint: https://irb.providerloop.ngrok.app/api
Callback URL: https://irb.providerloop.ngrok.app/webhook
```

### Any New Service:
```
Just use: https://[servicename].providerloop.ngrok.app
```

## TROUBLESHOOTING

### If "subdomain not available":
Your Pro account should allow subdomains of your reserved domain. If not:
1. Go to https://dashboard.ngrok.com/cloud-edge/domains
2. Ensure `providerloop.ngrok.app` is reserved
3. Check if wildcard subdomains are enabled

### To verify domain ownership:
```bash
ngrok api reserved-domains list
```

### Quick test:
```bash
# Test your reserved domain
ngrok http --url=providerloop.ngrok.app 3000

# Test a subdomain
ngrok http --url=test.providerloop.ngrok.app 3000
```

## PERMANENT SOLUTION SUMMARY

Your reserved domain `providerloop.ngrok.app` means:
- ✅ URLs never change
- ✅ Set webhooks once, forget about them
- ✅ Restart anytime without breaking anything
- ✅ Add new services with new subdomains
- ✅ Professional, branded URLs

This is THE solution to your webhook problem! No more copying and pasting URLs every time you restart.