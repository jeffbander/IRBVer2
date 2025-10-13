@echo off
REM Stop all Ngrok processes

echo Stopping all Ngrok tunnels...
taskkill /F /IM ngrok.exe

if %ERRORLEVEL% EQU 0 (
    echo Ngrok stopped successfully.
) else (
    echo No Ngrok processes found running.
)

timeout /t 2
