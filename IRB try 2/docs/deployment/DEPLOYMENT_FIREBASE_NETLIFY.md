# Firebase & Netlify Deployment Guide

Complete guide for deploying the IRB Management System to Firebase and Netlify.

## Table of Contents
- [Prerequisites](#prerequisites)
- [Firebase Deployment](#firebase-deployment)
- [Netlify Deployment](#netlify-deployment)
- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)
- [Post-Deployment](#post-deployment)

---

## Prerequisites

### General Requirements
- Node.js 20.x or higher
- npm or yarn package manager
- Git repository

### Platform-Specific Requirements

#### For Firebase:
```bash
npm install -g firebase-tools
firebase login
```

#### For Netlify:
```bash
npm install -g netlify-cli
netlify login
```

---

## Firebase Deployment

### 1. Initialize Firebase Project

```bash
# Login to Firebase
firebase login

# Initialize Firebase (if not done already)
firebase init

# Select:
# - Functions (for Next.js backend)
# - Hosting (for static files)
# Choose existing project or create new one
```

### 2. Update Firebase Configuration

Edit `.firebaserc` and replace `your-firebase-project-id` with your actual project ID:

```json
{
  "projects": {
    "default": "your-actual-firebase-project-id"
  }
}
```

### 3. Set Environment Variables

```bash
# Set environment variables for Firebase Functions
firebase functions:config:set \
  database.url="your-database-url" \
  jwt.secret="your-jwt-secret" \
  session.secret="your-session-secret" \
  aigents.api_url="https://start-chain-run-943506065004.us-central1.run.app" \
  aigents.email="notifications@providerloop.com"
```

### 4. Setup Production Database

For production, use a managed PostgreSQL database (recommended):
- **Firebase**: Use Cloud SQL
- **Alternative**: Use Supabase, PlanetScale, or Railway

Update your `DATABASE_URL` environment variable:
```bash
firebase functions:config:set \
  database.url="postgresql://user:password@host:5432/dbname?schema=public"
```

### 5. Deploy to Firebase

```bash
# Build and deploy
npm run deploy:firebase

# Or manually:
npm run build
firebase deploy
```

Your app will be available at: `https://your-project-id.web.app`

---

## Netlify Deployment

### Method 1: Deploy via Netlify CLI

#### 1. Install Dependencies
```bash
npm install -g netlify-cli
netlify login
```

#### 2. Link Your Site
```bash
# Initialize Netlify site
netlify init

# Or link to existing site
netlify link
```

#### 3. Set Environment Variables
```bash
# Set via CLI
netlify env:set DATABASE_URL "your-database-url"
netlify env:set JWT_SECRET "your-jwt-secret"
netlify env:set SESSION_SECRET "your-session-secret"
netlify env:set AIGENTS_API_URL "https://start-chain-run-943506065004.us-central1.run.app"
netlify env:set AIGENTS_EMAIL "notifications@providerloop.com"
```

Or set them in Netlify Dashboard:
1. Go to Site settings > Environment variables
2. Add all required variables from `.env.example`

#### 4. Deploy
```bash
# Deploy to production
npm run deploy:netlify

# Or manually:
netlify deploy --prod
```

### Method 2: Deploy via Git Integration (Recommended)

#### 1. Push to GitHub/GitLab/Bitbucket
```bash
git add .
git commit -m "Ready for deployment"
git push origin main
```

#### 2. Connect Repository in Netlify
1. Go to [Netlify Dashboard](https://app.netlify.com)
2. Click "Add new site" > "Import an existing project"
3. Connect your Git provider
4. Select your repository
5. Configure build settings:
   - **Build command**: `npm run build`
   - **Publish directory**: `.next`
   - **Node version**: 20

#### 3. Set Environment Variables
In Netlify Dashboard > Site settings > Environment variables, add all variables from `.env.example`

#### 4. Deploy
Netlify will automatically deploy on every push to your main branch.

---

## Environment Variables

### Required Variables

```env
# Database
DATABASE_URL="your-database-connection-string"

# Authentication
JWT_SECRET="your-super-secret-jwt-key-min-32-chars"
SESSION_SECRET="your-super-secret-session-key-min-32-chars"

# Application
NODE_ENV="production"
NEXT_PUBLIC_APP_URL="https://your-domain.com"

# Aigents Integration
AIGENTS_API_URL="https://start-chain-run-943506065004.us-central1.run.app"
AIGENTS_EMAIL="notifications@providerloop.com"
AIGENTS_WEBHOOK_SECRET="your-webhook-secret"
USE_AIGENTS_MOCK="false"
```

### Optional Variables

```env
# Rate Limiting
RATE_LIMIT_MAX="100"
RATE_LIMIT_WINDOW_MS="900000"

# File Upload
MAX_FILE_SIZE_MB="10"

# Email (if using email features)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
SMTP_FROM="noreply@yourdomain.com"
```

---

## Database Setup

### Using PostgreSQL (Recommended for Production)

#### Option 1: Supabase (Free tier available)
1. Create account at [supabase.com](https://supabase.com)
2. Create new project
3. Get connection string from Settings > Database
4. Update `DATABASE_URL` environment variable

#### Option 2: Railway (Free tier available)
1. Create account at [railway.app](https://railway.app)
2. Create new PostgreSQL database
3. Copy connection string
4. Update `DATABASE_URL` environment variable

#### Option 3: PlanetScale
1. Create account at [planetscale.com](https://planetscale.com)
2. Create new database
3. Get connection string
4. Update `DATABASE_URL` environment variable

### Run Migrations

After setting up your database:

```bash
# Set your DATABASE_URL
export DATABASE_URL="your-production-database-url"

# Run migrations
npx prisma migrate deploy

# Seed initial data (optional)
npx prisma db seed
```

---

## Post-Deployment

### 1. Verify Deployment

Visit your deployed URL and check:
- ✅ Home page loads
- ✅ Login page accessible
- ✅ Database connection works
- ✅ API routes respond correctly

### 2. Create Admin User

```bash
# Connect to your production database
npx prisma studio

# Or use SQL directly to create admin user
# Password will be hashed: "admin123"
```

### 3. Configure Custom Domain (Optional)

#### Firebase:
```bash
firebase hosting:channel:deploy production
```
Then follow Firebase console to add custom domain.

#### Netlify:
1. Go to Site settings > Domain management
2. Add custom domain
3. Configure DNS records as instructed

### 4. Enable HTTPS

Both Firebase and Netlify automatically provision SSL certificates.

### 5. Monitor Your Application

#### Firebase:
- Check Firebase Console > Functions for logs
- Monitor usage and performance

#### Netlify:
- Check Netlify Dashboard > Functions for logs
- View analytics and performance metrics

---

## Troubleshooting

### Build Failures

**Issue**: Build fails with Prisma errors
```bash
# Solution: Ensure postinstall runs
npm install
npx prisma generate
npm run build
```

**Issue**: Environment variables not found
```bash
# Firebase: Check functions config
firebase functions:config:get

# Netlify: Check environment variables
netlify env:list
```

### Database Connection Issues

**Issue**: Cannot connect to database
- Verify `DATABASE_URL` is set correctly
- Check database is accessible from deployment platform
- Ensure connection string includes `?schema=public` for PostgreSQL

### Function Timeout

**Issue**: Firebase functions timing out
- Increase timeout in `firebaseFunctions.js` (max 540s for 2nd gen)
- Check database query performance
- Consider adding indexes

---

## Security Checklist

- [ ] Change all default secrets and passwords
- [ ] Use strong JWT_SECRET (minimum 32 characters)
- [ ] Enable HTTPS only
- [ ] Set proper CORS origins
- [ ] Review and set rate limits
- [ ] Enable database connection pooling
- [ ] Set up monitoring and alerts
- [ ] Regular security updates

---

## Cost Optimization

### Firebase
- Use Cloud SQL connection pooling
- Set function max instances
- Monitor function invocations
- Use caching where possible

### Netlify
- Enable automatic optimization
- Use Netlify CDN for static assets
- Monitor bandwidth usage
- Consider Pro plan for production

---

## Support

For issues or questions:
- Check [Next.js Documentation](https://nextjs.org/docs)
- Firebase Support: [Firebase Console](https://console.firebase.google.com)
- Netlify Support: [Netlify Support](https://www.netlify.com/support/)

---

## Quick Commands Reference

```bash
# Firebase
firebase login
firebase init
firebase deploy
firebase functions:config:set key="value"
firebase functions:log

# Netlify
netlify login
netlify init
netlify deploy --prod
netlify env:set KEY "value"
netlify functions:log

# Database
npx prisma migrate deploy
npx prisma studio
npx prisma db seed

# Build
npm run build
npm run deploy:firebase
npm run deploy:netlify
```
