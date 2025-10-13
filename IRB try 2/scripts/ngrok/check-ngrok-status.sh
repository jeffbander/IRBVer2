#!/bin/bash
# Check the status of ngrok tunnels

echo "🔍 Checking ngrok tunnel status..."
echo ""

# Check if ngrok is running
if pgrep -x "ngrok" > /dev/null; then
    echo "✅ Ngrok is running"
    echo ""

    # Try to fetch tunnel info from local API
    echo "📊 Fetching tunnel information from ngrok API..."
    curl -s http://127.0.0.1:4040/api/tunnels | python3 -m json.tool 2>/dev/null || \
    curl -s http://127.0.0.1:4040/api/tunnels 2>/dev/null || \
    echo "⚠️  Could not fetch tunnel info. Visit http://127.0.0.1:4040 for details."

    echo ""
    echo "📌 Expected URLs (if tunnels are running):"
    echo "   • IRB App: https://irb.providerloop.ngrok.app"
    echo "   • Main App: https://providerloop.ngrok.app"
    echo "   • HeartVoice: https://heartvoice.providerloop.ngrok.app"
    echo "   • API: https://api.providerloop.ngrok.app"
    echo ""
    echo "🌐 Ngrok Web Interface: http://127.0.0.1:4040"
else
    echo "❌ Ngrok is not running"
    echo ""
    echo "🚀 To start tunnels, run:"
    echo "   bash start-ngrok-tunnel.sh"
    echo "   OR"
    echo "   start-ngrok-tunnel.bat"
fi

echo ""
