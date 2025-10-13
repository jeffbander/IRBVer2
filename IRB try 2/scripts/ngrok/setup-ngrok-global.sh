#!/bin/bash
# Setup ngrok configuration in the global ngrok config directory
# This ensures ngrok can be started from anywhere

echo "🔧 Setting up global ngrok configuration..."
echo ""

# Set Pro account token
export NGROK_AUTH_TOKEN="31wbk8kVUqHXH8umAHFOnOlR1Dg_3Cd2PSnnJZA5W9qY8FFtK"

# Create ngrok config directory if it doesn't exist
mkdir -p "$HOME/.ngrok2"

# Configure ngrok with auth token
echo "🔑 Configuring ngrok with auth token..."
ngrok config add-authtoken $NGROK_AUTH_TOKEN

# Copy the config to the global location
if [ -f "ngrok.yml" ]; then
    echo "📋 Copying ngrok.yml to global config directory..."
    cp ngrok.yml "$HOME/.ngrok2/ngrok.yml"
    echo "✅ Global ngrok configuration installed at: $HOME/.ngrok2/ngrok.yml"
else
    echo "❌ Error: ngrok.yml not found in current directory"
    exit 1
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "📌 Your reserved domain URLs:"
echo "   • IRB App: https://irb.providerloop.ngrok.app"
echo "   • Main App: https://providerloop.ngrok.app"
echo "   • HeartVoice: https://heartvoice.providerloop.ngrok.app"
echo "   • API: https://api.providerloop.ngrok.app"
echo ""
echo "🚀 To start tunnels, run:"
echo "   bash start-ngrok-tunnel.sh"
echo "   OR"
echo "   ngrok start --all"
echo ""
