# Ngrok Tunnel Manager Guide

Comprehensive guide for managing multiple ngrok tunnels safely for IRB and HeartVoice applications.

## Overview

The Ngrok Tunnel Manager allows you to safely run multiple tunnels with your Pro account's reserved domains. Your URLs **NEVER change**, making webhook integrations stable and reliable.

## Reserved Domains

Your Pro account has these permanent URLs configured:

- **IRB App**: `https://irb.providerloop.ngrok.app` (port 3009)
- **HeartVoice**: `https://heartvoice.providerloop.ngrok.app` (port 3000)
- **Main App**: `https://providerloop.ngrok.app` (port 3009)
- **API**: `https://api.providerloop.ngrok.app` (port 5000)

## Quick Start

### Using NPM Scripts (Recommended)

```bash
# Start all tunnels
npm run tunnel

# Start only IRB tunnel (won't affect HeartVoice)
npm run tunnel:irb

# Start only HeartVoice tunnel (won't affect IRB)
npm run tunnel:heartvoice

# Check tunnel status
npm run tunnel:status

# Stop all tunnels
npm run tunnel:stop

# Restart all tunnels
npm run tunnel:restart
```

### Using Node.js Manager Directly

```bash
# Start IRB tunnel only
node ngrok-manager.js start irb

# Start HeartVoice tunnel only
node ngrok-manager.js start heartvoice

# Start all tunnels
node ngrok-manager.js start all

# Check status
node ngrok-manager.js status

# Stop all tunnels
node ngrok-manager.js stop
```

### Using Batch File (Windows)

Double-click `ngrok-tunnel-manager.bat` for an interactive menu.

## Important Features

### Safe Multi-Tunnel Management

The manager ensures:
- **No conflicts**: Properly clears old sessions before starting new ones
- **Reserved domains**: Your URLs never change between restarts
- **Independent operation**: Start one app's tunnel without affecting the other
- **Status monitoring**: Check what's running at any time

### Web Interface

When tunnels are running, visit:
- `http://127.0.0.1:4040` - Ngrok inspection interface
- See all active tunnels, request logs, and replay requests

## Common Workflows

### Development Workflow 1: IRB App Only

```bash
# Terminal 1: Start IRB app
npm run dev

# Terminal 2: Start IRB tunnel
npm run tunnel:irb

# Your IRB app is now accessible at:
# https://irb.providerloop.ngrok.app
```

### Development Workflow 2: Both Apps Running

```bash
# Terminal 1: Start IRB app (port 3009)
npm run dev

# Terminal 2: Start HeartVoice app (port 3000)
cd ../heart-failure-app
npm run dev

# Terminal 3: Start all tunnels
npm run tunnel

# Both apps are now accessible:
# https://irb.providerloop.ngrok.app (IRB)
# https://heartvoice.providerloop.ngrok.app (HeartVoice)
```

### Development Workflow 3: Switch Between Apps

```bash
# Working on HeartVoice, then need to test IRB webhooks
npm run tunnel:stop
npm run tunnel:irb

# Later, switch back to HeartVoice
npm run tunnel:stop
npm run tunnel:heartvoice
```

## Webhook Configuration

### Aigents Integration (IRB App)

Configure your Aigents webhooks with these permanent URLs:

```
Base URL: https://irb.providerloop.ngrok.app
Webhook URL: https://irb.providerloop.ngrok.app/api/webhooks/aigents
```

These URLs **never change**, so you only need to configure them once in Aigents.

### Testing Webhooks

```bash
# Start the tunnel
npm run tunnel:irb

# In another terminal, check tunnel status
npm run tunnel:status

# Test your webhook
curl -X POST https://irb.providerloop.ngrok.app/api/webhooks/aigents \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

## Troubleshooting

### Tunnel Won't Start

```bash
# Stop all existing sessions
npm run tunnel:stop

# Wait a few seconds, then start again
npm run tunnel:irb
```

### Port Already in Use

```bash
# Check what's using the port
# On Windows
netstat -ano | findstr :3009

# Kill the process if needed
taskkill /F /PID <process_id>
```

### Can't Access Web Interface

```bash
# Check if ngrok is running
npm run tunnel:status

# If not running, start it
npm run tunnel:irb
```

### Reserved Domain Not Working

The reserved domains require a Pro account. If you see random URLs instead:

1. Verify your auth token is correct in `ngrok.yml`
2. Check your ngrok account at https://dashboard.ngrok.com
3. Ensure your Pro subscription is active

## Configuration Files

### ngrok.yml

Main configuration with all tunnel definitions and reserved domains.

### ngrok-manager.js

Node.js automation script with CLI interface.

### ngrok-tunnel-manager.bat

Windows batch script with interactive menu.

## Security Notes

- Your auth token is included in the scripts - keep these files secure
- Never commit `ngrok.yml` with your token to public repositories
- Consider using environment variables for production deployments
- The web interface (port 4040) is only accessible locally

## Pro Account Features Used

- **Reserved Domains**: Your URLs never change
- **Multiple Tunnels**: Run several tunnels simultaneously
- **Custom Subdomains**: Use branded providerloop.ngrok.app domains
- **No Rate Limits**: Unlimited requests to your tunnels

## Support

For issues with:
- **Ngrok**: Visit https://ngrok.com/docs
- **This Manager**: Check the scripts for inline documentation
- **Webhooks**: Test using the ngrok web interface at http://127.0.0.1:4040

## Version History

- **v1.0**: Initial release with batch file, Node.js manager, and npm scripts
  - Support for multiple independent tunnels
  - Reserved domain configuration
  - Status monitoring and safe session management
