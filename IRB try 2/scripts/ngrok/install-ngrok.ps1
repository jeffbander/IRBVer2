# Ngrok Installation Script for Windows
# Downloads and installs ngrok, then configures it with your auth token

Write-Host ""
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host "                    NGROK INSTALLATION SCRIPT" -ForegroundColor Cyan
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host ""

$NGROK_AUTH_TOKEN = "31wbk8kVUqHXH8umAHFOnOlR1Dg_3Cd2PSnnJZA5W9qY8FFtK"
$DOWNLOAD_URL = "https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-windows-amd64.zip"
$INSTALL_DIR = "$env:LOCALAPPDATA\ngrok"
$ZIP_FILE = "$env:TEMP\ngrok.zip"

Write-Host "Step 1: Creating installation directory..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path $INSTALL_DIR | Out-Null
Write-Host "[OK] Directory created: $INSTALL_DIR" -ForegroundColor Green
Write-Host ""

Write-Host "Step 2: Downloading ngrok..." -ForegroundColor Yellow
try {
    Invoke-WebRequest -Uri $DOWNLOAD_URL -OutFile $ZIP_FILE
    Write-Host "[OK] Downloaded successfully" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Failed to download ngrok: $_" -ForegroundColor Red
    exit 1
}
Write-Host ""

Write-Host "Step 3: Extracting ngrok..." -ForegroundColor Yellow
try {
    Expand-Archive -Path $ZIP_FILE -DestinationPath $INSTALL_DIR -Force
    Write-Host "[OK] Extracted successfully" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Failed to extract: $_" -ForegroundColor Red
    exit 1
}
Write-Host ""

Write-Host "Step 4: Adding ngrok to PATH..." -ForegroundColor Yellow
$CurrentPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($CurrentPath -notlike "*$INSTALL_DIR*") {
    [Environment]::SetEnvironmentVariable("Path", "$CurrentPath;$INSTALL_DIR", "User")
    Write-Host "[OK] Added to PATH (restart terminal to take effect)" -ForegroundColor Green
} else {
    Write-Host "[INFO] Already in PATH" -ForegroundColor Cyan
}
Write-Host ""

Write-Host "Step 5: Configuring ngrok with auth token..." -ForegroundColor Yellow
try {
    & "$INSTALL_DIR\ngrok.exe" config add-authtoken $NGROK_AUTH_TOKEN
    Write-Host "[OK] Auth token configured" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Failed to configure auth token: $_" -ForegroundColor Red
}
Write-Host ""

Write-Host "Step 6: Verifying installation..." -ForegroundColor Yellow
try {
    $version = & "$INSTALL_DIR\ngrok.exe" version
    Write-Host "[OK] ngrok installed: $version" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Installation verification failed: $_" -ForegroundColor Red
    exit 1
}
Write-Host ""

Write-Host "============================================================================" -ForegroundColor Green
Write-Host "                    INSTALLATION COMPLETE!" -ForegroundColor Green
Write-Host "============================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Close and reopen your terminal (to refresh PATH)" -ForegroundColor White
Write-Host "  2. Run: npm run tunnel:irb" -ForegroundColor White
Write-Host "  3. Your IRB app will be available at: https://irb.providerloop.ngrok.app" -ForegroundColor White
Write-Host ""
Write-Host "Installation location: $INSTALL_DIR" -ForegroundColor Cyan
Write-Host ""

# Clean up
Remove-Item $ZIP_FILE -Force -ErrorAction SilentlyContinue

Write-Host "Press any key to continue..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
