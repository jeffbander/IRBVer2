# Important Note About Ngrok Sessions

## Session Limit Detected

Your ngrok account currently has a **1 simultaneous session limit**. This means:

- You can only run **ONE ngrok agent at a time**
- You **CANNOT** run separate tunnels for IRB and HeartVoice simultaneously
- You **MUST** choose which app to tunnel at any given time

## Solutions

### Option 1: Run Multiple Tunnels from Single Agent (Recommended)

Since you have reserved domains configured, you can run ALL tunnels from a single ngrok session:

```bash
# Start ALL tunnels at once (IRB + HeartVoice + Main + API)
npm run tunnel

# Or manually:
"$LOCALAPPDATA/ngrok/ngrok.exe" start --all --config ngrok.yml
```

**This is the best solution** because:
- All your apps are accessible at the same time
- Each app gets its own reserved domain
- Only uses ONE ngrok session
- No conflicts

### Option 2: Switch Between Apps

If you only need one app at a time:

```bash
# For IRB only
npm run tunnel:irb

# For HeartVoice only (stop IRB first)
npm run tunnel:stop
npm run tunnel:heartvoice
```

### Option 3: Upgrade Your Plan

To run multiple separate ngrok agents (not needed if using Option 1):
- Visit: https://dashboard.ngrok.com/billing/choose-a-plan
- Upgrade to remove the session limit

## Current Configuration

Your `ngrok.yml` already has all tunnels defined:

```yaml
tunnels:
  irb:           # Port 3009 -> https://irb.providerloop.ngrok.app
  heartvoice:    # Port 3000 -> https://heartvoice.providerloop.ngrok.app
  main:          # Port 3009 -> https://providerloop.ngrok.app
  api:           # Port 5000 -> https://api.providerloop.ngrok.app
```

## Recommended Workflow

### Development Setup

```bash
# Terminal 1: Start IRB app
npm run dev

# Terminal 2: Start HeartVoice app (in heart failure app directory)
cd ../heart-failure-app
npm run dev

# Terminal 3: Start ALL tunnels with one command
cd ../IRB\ try\ 2
npm run tunnel
```

Now both apps are accessible:
- IRB: https://irb.providerloop.ngrok.app
- HeartVoice: https://heartvoice.providerloop.ngrok.app

### Single App Setup

If you're only working on IRB today:

```bash
# Terminal 1: Start IRB app
npm run dev

# Terminal 2: Start IRB tunnel only
npm run tunnel:irb
```

## Why This Happened

The error occurred because:
1. There was already an ngrok session running (possibly from the heart failure app)
2. Trying to start a second session exceeded your account's limit
3. The tunnel manager tried to start a new session instead of reusing the existing one

## Next Steps

**I recommend using Option 1** - run all tunnels from a single session:

```bash
npm run tunnel
```

This way:
- You never hit the session limit
- All your apps are accessible
- The URLs never change
- No need to stop/start between apps
