@echo off
REM =============================================================================
REM Ngrok Tunnel Manager - Safely manage multiple ngrok tunnels
REM Supports IRB app and HeartVoice app with reserved domains
REM =============================================================================

setlocal enabledelayedexpansion

set "NGROK_AUTH_TOKEN=31wbk8kVUqHXH8umAHFOnOlR1Dg_3Cd2PSnnJZA5W9qY8FFtK"
set "NGROK_CONFIG=ngrok.yml"

:MENU
cls
echo.
echo ============================================================================
echo                    NGROK TUNNEL MANAGER
echo ============================================================================
echo.
echo   1. Start ALL tunnels (IRB + HeartVoice + Main + API)
echo   2. Start IRB tunnel only (port 3009)
echo   3. Start HeartVoice tunnel only (port 3000)
echo   4. Check tunnel status
echo   5. Stop all tunnels
echo   6. View ngrok web interface (http://127.0.0.1:4040)
echo   0. Exit
echo.
echo ============================================================================
echo.

set /p choice="Enter your choice (0-6): "

if "%choice%"=="1" goto START_ALL
if "%choice%"=="2" goto START_IRB
if "%choice%"=="3" goto START_HEARTVOICE
if "%choice%"=="4" goto CHECK_STATUS
if "%choice%"=="5" goto STOP_ALL
if "%choice%"=="6" goto WEB_INTERFACE
if "%choice%"=="0" goto EXIT
goto MENU

:START_ALL
echo.
echo Starting ALL tunnels...
echo.
call :CONFIGURE_NGROK
call :CLEAR_SESSIONS
echo Starting all tunnels with reserved domains...
start "" cmd /c "ngrok start --all --config %NGROK_CONFIG%"
timeout /t 5 /nobreak >nul
call :SHOW_URLS_ALL
goto MENU

:START_IRB
echo.
echo Starting IRB tunnel only (port 3009)...
echo.
call :CONFIGURE_NGROK
call :CLEAR_SESSIONS
echo Starting IRB tunnel...
start "" cmd /c "ngrok start irb --config %NGROK_CONFIG%"
timeout /t 5 /nobreak >nul
call :SHOW_URLS_IRB
goto MENU

:START_HEARTVOICE
echo.
echo Starting HeartVoice tunnel only (port 3000)...
echo.
call :CONFIGURE_NGROK
call :CLEAR_SESSIONS
echo Starting HeartVoice tunnel...
start "" cmd /c "ngrok start heartvoice --config %NGROK_CONFIG%"
timeout /t 5 /nobreak >nul
call :SHOW_URLS_HEARTVOICE
goto MENU

:CHECK_STATUS
echo.
echo Checking tunnel status...
echo.
tasklist | findstr ngrok.exe >nul 2>&1
if %errorlevel%==0 (
    echo [OK] ngrok is running
    echo.
    echo Active tunnels:
    curl -s http://127.0.0.1:4040/api/tunnels 2>nul
    if %errorlevel%==0 (
        echo.
        echo Visit http://127.0.0.1:4040 for detailed status
    ) else (
        echo Unable to connect to ngrok web interface
    )
) else (
    echo [INFO] ngrok is not currently running
)
echo.
pause
goto MENU

:STOP_ALL
echo.
echo Stopping all ngrok tunnels...
echo.
taskkill /F /IM ngrok.exe 2>nul
if %errorlevel%==0 (
    echo [OK] All ngrok processes stopped
) else (
    echo [INFO] No ngrok processes were running
)
echo.
echo Clearing remote sessions...
curl -X DELETE -H "Authorization: Bearer %NGROK_AUTH_TOKEN%" -H "Ngrok-Version: 2" "https://api.ngrok.com/tunnel_sessions" 2>nul
echo.
pause
goto MENU

:WEB_INTERFACE
echo.
echo Opening ngrok web interface...
echo.
tasklist | findstr ngrok.exe >nul 2>&1
if %errorlevel%==0 (
    start http://127.0.0.1:4040
) else (
    echo [ERROR] ngrok is not running. Please start a tunnel first.
    pause
)
goto MENU

:CONFIGURE_NGROK
echo Configuring ngrok with auth token...
ngrok config add-authtoken %NGROK_AUTH_TOKEN% >nul 2>&1
exit /b

:CLEAR_SESSIONS
echo Clearing any existing ngrok sessions...
taskkill /F /IM ngrok.exe 2>nul
curl -X DELETE -H "Authorization: Bearer %NGROK_AUTH_TOKEN%" -H "Ngrok-Version: 2" "https://api.ngrok.com/tunnel_sessions" 2>nul
timeout /t 3 /nobreak >nul
exit /b

:SHOW_URLS_ALL
echo.
echo ============================================================================
echo                    PERMANENT TUNNEL URLS
echo ============================================================================
echo.
echo   IRB App:       https://irb.providerloop.ngrok.app
echo   Main App:      https://providerloop.ngrok.app
echo   HeartVoice:    https://heartvoice.providerloop.ngrok.app
echo   API:           https://api.providerloop.ngrok.app
echo.
echo   Web Interface: http://127.0.0.1:4040
echo.
echo ============================================================================
echo.
echo These URLs NEVER change - you can safely bookmark them!
echo.
pause
exit /b

:SHOW_URLS_IRB
echo.
echo ============================================================================
echo                    IRB TUNNEL URL
echo ============================================================================
echo.
echo   IRB App:       https://irb.providerloop.ngrok.app
echo   Web Interface: http://127.0.0.1:4040
echo.
echo ============================================================================
echo.
pause
exit /b

:SHOW_URLS_HEARTVOICE
echo.
echo ============================================================================
echo                    HEARTVOICE TUNNEL URL
echo ============================================================================
echo.
echo   HeartVoice:    https://heartvoice.providerloop.ngrok.app
echo   Web Interface: http://127.0.0.1:4040
echo.
echo ============================================================================
echo.
pause
exit /b

:EXIT
echo.
echo Exiting Ngrok Tunnel Manager...
echo.
exit /b
