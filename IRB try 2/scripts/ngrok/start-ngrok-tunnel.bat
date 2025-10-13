@echo off
REM Start ngrok tunnels with reserved domain for all applications

echo 🚀 Setting up ProviderLoop tunnels with reserved domain
echo.

REM Set Pro account token
set NGROK_AUTH_TOKEN=31wbk8kVUqHXH8umAHFOnOlR1Dg_3Cd2PSnnJZA5W9qY8FFtK

REM Kill any existing ngrok processes
echo 🔄 Clearing any existing ngrok sessions...
taskkill /F /IM ngrok.exe 2>nul

REM Clear remote sessions via API
echo 🧹 Clearing remote ngrok sessions...
curl -X DELETE -H "Authorization: Bearer %NGROK_AUTH_TOKEN%" -H "Ngrok-Version: 2" "https://api.ngrok.com/tunnel_sessions" 2>nul

echo ⏳ Waiting for cleanup...
timeout /t 5 /nobreak >nul

REM Configure ngrok with auth token
echo 🔑 Configuring ngrok with auth token...
ngrok config add-authtoken %NGROK_AUTH_TOKEN% 2>nul

REM Start all tunnels using the local config file
echo 🚀 Starting tunnels with reserved domain...
start /B ngrok start --all --config ngrok.yml

echo ⏳ Waiting for tunnels to initialize...
timeout /t 5 /nobreak >nul

REM Verify tunnels are running
echo.
echo ✅ Your permanent URLs (these NEVER change):
echo    • IRB App: https://irb.providerloop.ngrok.app
echo    • Main App: https://providerloop.ngrok.app
echo    • HeartVoice: https://heartvoice.providerloop.ngrok.app
echo    • API: https://api.providerloop.ngrok.app
echo.
echo 📌 Ngrok Web Interface: http://127.0.0.1:4040
echo 📌 Update your webhooks ONCE with these URLs - they're permanent!
echo.
echo ℹ️  These URLs will remain the same even after restarting ngrok
echo ℹ️  You can check tunnel status at: http://127.0.0.1:4040
echo.
pause
