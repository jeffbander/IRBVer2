#!/bin/bash
# Start ngrok tunnels with reserved domain for all applications

echo "🚀 Setting up ProviderLoop tunnels with reserved domain"
echo ""

# Set Pro account token
export NGROK_AUTH_TOKEN="31wbk8kVUqHXH8umAHFOnOlR1Dg_3Cd2PSnnJZA5W9qY8FFtK"

# Kill any existing ngrok processes
echo "🔄 Clearing any existing ngrok sessions..."
if command -v taskkill &> /dev/null; then
    taskkill /F /IM ngrok.exe 2>/dev/null || true
else
    pkill -9 ngrok 2>/dev/null || true
fi

# Clear remote sessions via API
echo "🧹 Clearing remote ngrok sessions..."
curl -X DELETE -H "Authorization: Bearer $NGROK_AUTH_TOKEN" \
     -H "Ngrok-Version: 2" \
     "https://api.ngrok.com/tunnel_sessions" 2>/dev/null || true

echo "⏳ Waiting for cleanup..."
sleep 5

# Configure ngrok with auth token
echo "🔑 Configuring ngrok with auth token..."
ngrok config add-authtoken $NGROK_AUTH_TOKEN 2>/dev/null || true

# Start all tunnels using the local config file
echo "🚀 Starting tunnels with reserved domain..."
ngrok start --all --config ngrok.yml &

echo "⏳ Waiting for tunnels to initialize..."
sleep 5

# Verify tunnels are running
echo ""
echo "✅ Your permanent URLs (these NEVER change):"
echo "   • IRB App: https://irb.providerloop.ngrok.app"
echo "   • Main App: https://providerloop.ngrok.app"
echo "   • HeartVoice: https://heartvoice.providerloop.ngrok.app"
echo "   • API: https://api.providerloop.ngrok.app"
echo ""
echo "📌 Ngrok Web Interface: http://127.0.0.1:4040"
echo "📌 Update your webhooks ONCE with these URLs - they're permanent!"
echo ""
echo "ℹ️  These URLs will remain the same even after restarting ngrok"
echo "ℹ️  You can check tunnel status at: http://127.0.0.1:4040"
