@echo off
REM Start Ngrok Tunnel for IRB Management System
REM This script starts ngrok with the configuration file

echo Starting Ngrok tunnel for IRB Management System on port 3009...
echo.

REM Kill any existing ngrok processes
taskkill /F /IM ngrok.exe >nul 2>&1

REM Wait a moment for processes to fully terminate
timeout /t 2 /nobreak >nul

REM Start ngrok with the configuration file
start "Ngrok IRB Tunnel" ngrok.cmd start irb-app --config ngrok-config.yml

REM Wait for ngrok to start
timeout /t 3 /nobreak >nul

REM Get and display the tunnel URL
echo.
echo Fetching tunnel information...
echo.

curl -s http://localhost:4040/api/tunnels | powershell -Command "$input | ConvertFrom-Json | Select-Object -ExpandProperty tunnels | ForEach-Object { Write-Host \"Tunnel Name: $($_.name)\"; Write-Host \"Public URL: $($_.public_url)\"; Write-Host \"Forwarding to: $($_.config.addr)\"; Write-Host \"\" }"

echo.
echo Ngrok Web Interface: http://localhost:4040
echo.
echo Press any key to view ngrok logs...
pause >nul

REM Open ngrok web interface
start http://localhost:4040
