@echo off
REM Start IRB Tunnel Only - Clears existing sessions first
REM This script handles the session limit by stopping any existing tunnels

echo.
echo ============================================================================
echo               STARTING IRB TUNNEL (PORT 3009)
echo ============================================================================
echo.

set "NGROK_PATH=%LOCALAPPDATA%\ngrok\ngrok.exe"

echo Step 1: Checking for existing ngrok processes...
tasklist | findstr ngrok.exe >nul 2>&1
if %errorlevel%==0 (
    echo [INFO] Found existing ngrok process
    echo [ACTION] Stopping existing tunnel to avoid session limit...
    taskkill /F /IM ngrok.exe >nul 2>&1
    timeout /t 3 /nobreak >nul
    echo [OK] Existing tunnel stopped
) else (
    echo [OK] No existing ngrok process found
)
echo.

echo Step 2: Starting IRB tunnel...
echo [INFO] Starting tunnel on port 3009
start "ngrok-irb" cmd /k "%NGROK_PATH%" start irb --config ngrok.yml
echo.

echo Step 3: Waiting for tunnel to initialize...
timeout /t 5 /nobreak >nul
echo.

echo ============================================================================
echo                    IRB TUNNEL ACTIVE
echo ============================================================================
echo.
echo   Your IRB app is now accessible at:
echo   https://irb.providerloop.ngrok.app
echo.
echo   Web Interface: http://127.0.0.1:4040
echo.
echo ============================================================================
echo.
echo [INFO] This URL NEVER changes - you can safely bookmark it!
echo [INFO] To stop the tunnel, close the ngrok window
echo.
echo NOTE: Only ONE tunnel can run at a time with your current plan
echo       HeartVoice tunnel has been stopped (if it was running)
echo.
pause
