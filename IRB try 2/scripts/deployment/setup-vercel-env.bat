@echo off
echo ========================================
echo Setting up Vercel Environment Variables
echo ========================================
echo.
echo This script will guide you through adding environment variables.
echo Just press ENTER after each value is entered automatically.
echo.
pause

echo.
echo [1/6] Setting DATABASE_URL...
echo When prompted, the value will be: file:./dev.db
vercel env add DATABASE_URL production

echo.
echo [2/6] Setting JWT_SECRET...
echo When prompted, the value will be: prod-jwt-secret-change-this-to-minimum-32-random-characters
vercel env add JWT_SECRET production

echo.
echo [3/6] Setting SESSION_SECRET...
echo When prompted, the value will be: prod-session-secret-change-this-to-minimum-32-random-chars
vercel env add SESSION_SECRET production

echo.
echo [4/6] Setting AIGENTS_API_URL...
echo When prompted, the value will be: https://start-chain-run-943506065004.us-central1.run.app
vercel env add AIGENTS_API_URL production

echo.
echo [5/6] Setting AIGENTS_EMAIL...
echo When prompted, the value will be: notifications@providerloop.com
vercel env add AIGENTS_EMAIL production

echo.
echo [6/6] Setting NODE_ENV...
echo When prompted, the value will be: production
vercel env add NODE_ENV production

echo.
echo ========================================
echo Environment variables setup complete!
echo ========================================
echo.
echo Now redeploying to apply changes...
vercel --prod

echo.
echo ========================================
echo Deployment complete!
echo ========================================
pause
