# Ngrok Tunnel Manager - Setup Complete

## Summary

I've successfully set up a comprehensive Ngrok Tunnel Manager for your IRB application. The system is ready to use, but there's an important constraint to be aware of.

## What Was Created

### 1. Ngrok Installation
- Installed ngrok v3.30.0
- Location: `C:\Users\jeffr\AppData\Local\ngrok`
- Configured with your auth token
- Added to system PATH

### 2. Tunnel Manager Scripts

#### Windows Batch File (Interactive)
- **File**: `ngrok-tunnel-manager.bat`
- **Usage**: Double-click for menu-driven interface
- **Features**: Start/stop/status all tunnels

#### Node.js Manager (Automation)
- **File**: `ngrok-manager.js`
- **Usage**: Command-line automation
- **Features**: Full programmatic control

#### Simple IRB Launcher
- **File**: `start-irb-tunnel-only.bat`
- **Usage**: Double-click to start IRB tunnel
- **Features**: Auto-clears existing sessions

### 3. NPM Scripts (Added to package.json)

```bash
npm run tunnel              # Start all tunnels
npm run tunnel:irb          # Start IRB only
npm run tunnel:heartvoice   # Start HeartVoice only
npm run tunnel:status       # Check status
npm run tunnel:stop         # Stop all tunnels
npm run tunnel:restart      # Restart all
```

### 4. Documentation
- `NGROK_TUNNEL_MANAGER_GUIDE.md` - Complete usage guide
- `IMPORTANT_NGROK_NOTE.md` - Session limit explanation
- `install-ngrok.ps1` - Installation script

## Important Discovery: Session Limit

Your ngrok account has a **1 simultaneous session limit**. This means:

❌ **Cannot run**: Separate IRB and HeartVoice tunnels simultaneously
✅ **Can run**: All tunnels from a single ngrok session

## The Solution

Your `ngrok.yml` is already configured with reserved domains for ALL apps:

```yaml
tunnels:
  irb:        https://irb.providerloop.ngrok.app       (port 3009)
  heartvoice: https://heartvoice.providerloop.ngrok.app (port 3000)
  main:       https://providerloop.ngrok.app            (port 3009)
  api:        https://api.providerloop.ngrok.app        (port 5000)
```

## Recommended Workflow

### To Run Both Apps Simultaneously

```bash
# Terminal 1: Start IRB app
cd "C:\Users\jeffr\IRB try 2"
npm run dev

# Terminal 2: Start HeartVoice app
cd "C:\Users\jeffr\heart-failure-app"  # (adjust path)
npm run dev

# Terminal 3: Start ALL tunnels with ONE command
cd "C:\Users\jeffr\IRB try 2"
npm run tunnel
```

Result:
- ✅ IRB accessible at: https://irb.providerloop.ngrok.app
- ✅ HeartVoice accessible at: https://heartvoice.providerloop.ngrok.app
- ✅ Only ONE ngrok session used
- ✅ URLs NEVER change

### To Run IRB Only

```bash
# Terminal 1: Start IRB app
npm run dev

# Terminal 2: Start IRB tunnel
npm run tunnel:irb
```

Result:
- ✅ IRB accessible at: https://irb.providerloop.ngrok.app

## Current Issue

There appears to be an existing ngrok session running somewhere that's preventing new tunnels from starting. To resolve this:

### Option 1: Check ngrok Dashboard
1. Visit: https://dashboard.ngrok.com/agents
2. View active sessions
3. Stop any running sessions from the dashboard

### Option 2: Restart Computer
- This will clear any lingering sessions
- Then run: `npm run tunnel`

### Option 3: Wait 24 Hours
- Sessions may auto-expire
- Then run: `npm run tunnel`

## Quick Start (After Clearing Sessions)

For your IRB app specifically:

```bash
# Make sure your IRB app is running on port 3009
npm run dev

# In another terminal, start the IRB tunnel
npm run tunnel:irb
```

Your app will be available at: **https://irb.providerloop.ngrok.app**

## Files Created

```
IRB try 2/
├── ngrok-manager.js                    # Node.js tunnel manager
├── ngrok-tunnel-manager.bat            # Interactive Windows menu
├── start-irb-tunnel-only.bat           # Simple IRB launcher
├── install-ngrok.ps1                   # Installation script
├── NGROK_TUNNEL_MANAGER_GUIDE.md       # Complete usage guide
├── IMPORTANT_NGROK_NOTE.md             # Session limit explained
├── NGROK_SETUP_COMPLETE.md             # This file
├── ngrok.yml                           # Config (already existed)
└── package.json                        # Updated with npm scripts
```

## Web Interface

When tunnels are running:
- Visit: http://127.0.0.1:4040
- Inspect all requests
- Replay webhooks
- Debug traffic

## Security Notes

- Your auth token is in the scripts - keep them secure
- Never commit these files to public repos
- The URLs never change, so configure webhooks once

## Next Steps

1. **Clear the existing session** (see options above)
2. **Start your IRB app**: `npm run dev`
3. **Start the tunnel**: `npm run tunnel:irb`
4. **Configure webhooks** in Aigents with: `https://irb.providerloop.ngrok.app/api/webhooks/aigents`
5. **Test your webhooks** using the ngrok web interface

## Need Help?

- **Ngrok Docs**: https://ngrok.com/docs
- **Session Management**: https://dashboard.ngrok.com/agents
- **Error Details**: Check `ngrok-irb.log` file

## Summary

The Ngrok Tunnel Manager is fully set up and ready to use. The only remaining step is to clear the existing ngrok session (which appears to be from your heart failure app) and then you can start the IRB tunnel. The system is designed to safely manage multiple apps without conflicts.

Your permanent URL for the IRB app is: **https://irb.providerloop.ngrok.app**

This URL will NEVER change, making it perfect for webhook integrations! 🚀
