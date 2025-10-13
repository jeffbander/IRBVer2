@echo off
echo ========================================
echo Netlify Deployment Script
echo ========================================
echo.

REM Check if Netlify CLI is installed
where netlify >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo ERROR: Netlify CLI not found!
    echo Please install it with: npm install -g netlify-cli
    exit /b 1
)

echo Step 1: Installing dependencies...
call npm install
if %ERRORLEVEL% neq 0 (
    echo ERROR: npm install failed!
    exit /b 1
)

echo.
echo Step 2: Generating Prisma client...
call npx prisma generate
if %ERRORLEVEL% neq 0 (
    echo ERROR: Prisma generate failed!
    exit /b 1
)

echo.
echo Step 3: Building application...
set NETLIFY=true
call npm run build
if %ERRORLEVEL% neq 0 (
    echo ERROR: Build failed!
    exit /b 1
)

echo.
echo Step 4: Deploying to Netlify...
call netlify deploy --prod
if %ERRORLEVEL% neq 0 (
    echo ERROR: Netlify deploy failed!
    exit /b 1
)

echo.
echo ========================================
echo Deployment Complete!
echo ========================================
echo Your app should now be live!
echo.
echo Don't forget to:
echo - Set environment variables in Netlify Dashboard
echo - Run database migrations
echo - Test the deployment
echo ========================================
