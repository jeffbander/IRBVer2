@echo off
REM Get Current Ngrok Tunnel URL

echo Fetching current tunnel information...
echo.

curl -s http://localhost:4040/api/tunnels 2>nul | powershell -Command "$input | ConvertFrom-Json | Select-Object -ExpandProperty tunnels | ForEach-Object { Write-Host \"Public URL: $($_.public_url)\" -ForegroundColor Green; Write-Host \"Forwarding to: localhost:$($_.config.addr)\" }"

if %ERRORLEVEL% NEQ 0 (
    echo Error: Ngrok is not running or API is not accessible.
    echo Please start ngrok first using: start-ngrok.bat
)

echo.
pause
