@echo off
echo ========================================
echo Firebase Deployment Script
echo ========================================
echo.

REM Check if Firebase CLI is installed
where firebase >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo ERROR: Firebase CLI not found!
    echo Please install it with: npm install -g firebase-tools
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
call npm run build
if %ERRORLEVEL% neq 0 (
    echo ERROR: Build failed!
    exit /b 1
)

echo.
echo Step 4: Deploying to Firebase...
call firebase deploy
if %ERRORLEVEL% neq 0 (
    echo ERROR: Firebase deploy failed!
    exit /b 1
)

echo.
echo ========================================
echo Deployment Complete!
echo ========================================
echo Your app should now be live at:
echo https://your-project-id.web.app
echo.
echo Don't forget to:
echo - Set environment variables in Firebase Console
echo - Run database migrations
echo - Test the deployment
echo ========================================
