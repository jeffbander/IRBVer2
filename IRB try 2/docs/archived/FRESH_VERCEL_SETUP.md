# 🚀 Fresh Vercel Deployment - Step by Step

Starting completely fresh with your Vercel account: https://vercel.com/jeff-banders-projects

## Method 1: Via Vercel Dashboard (RECOMMENDED - Easiest)

### Step 1: Import Project from GitHub

**Option A: If your code is already on GitHub**
1. Go to https://vercel.com/jeff-banders-projects
2. Click **"Add New..."** → **"Project"**
3. Click **"Import Git Repository"**
4. Find and select your repository
5. Configure project:
   - **Framework Preset:** Next.js (auto-detected)
   - **Root Directory:** `./`
   - **Build Command:** `npm run build`
   - **Output Directory:** `.next`
   - **Install Command:** `npm install`

6. Click **"Environment Variables"** section
7. Add all 6 variables (see below)
8. Click **"Deploy"**
9. Wait 2-3 minutes ✅

**Option B: If code is NOT on GitHub yet**
1. First, push to GitHub:
   ```bash
   cd "C:\Users\jeffr\IRB try 2"
   git add .
   git commit -m "Ready for Vercel deployment"
   git push origin main
   ```
2. Then follow Option A steps above

---

## Method 2: Via Vercel CLI (Fresh Start)

### Step 1: Clean Start
```bash
cd "C:\Users\jeffr\IRB try 2"
vercel login
```

### Step 2: Deploy Fresh
```bash
vercel --prod
```

**Answer the prompts:**
- ✅ Set up and deploy "C:\Users\jeffr\IRB try 2"? → **Y**
- 🔍 Which scope do you want to deploy to? → **jeff-banders-projects**
- 🔗 Link to existing project? → **N**
- 📝 What's your project's name? → **irb-management-system-prod** (or any name)
- 📂 In which directory is your code located? → **./** (press Enter)
- 🎨 Want to modify the settings? → **N**

Vercel will then build and deploy automatically!

---

## 🔐 Environment Variables (Add These)

**Where to add:**
- **Dashboard:** Vercel Dashboard → Your Project → Settings → Environment Variables
- **CLI:** After deployment (see below)

### Required Variables:

1. **DATABASE_URL**
   ```
   file:./dev.db
   ```
   *(Production note: Change to PostgreSQL later)*

2. **JWT_SECRET**
   ```
   prod-jwt-secret-change-this-to-minimum-32-random-characters
   ```
   *(IMPORTANT: Change this to a real random string)*

3. **SESSION_SECRET**
   ```
   prod-session-secret-change-this-to-minimum-32-random-chars
   ```
   *(IMPORTANT: Change this to a real random string)*

4. **AIGENTS_API_URL**
   ```
   https://start-chain-run-943506065004.us-central1.run.app
   ```

5. **AIGENTS_EMAIL**
   ```
   notifications@providerloop.com
   ```

6. **NODE_ENV**
   ```
   production
   ```

### Generate Strong Secrets (Optional but Recommended)

Run this to generate real secrets:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Use the output for JWT_SECRET and SESSION_SECRET.

---

## 📋 After Adding Environment Variables

### Via Dashboard:
1. Go to **Deployments** tab
2. Click **"..."** on latest deployment → **"Redeploy"**

### Via CLI:
```bash
vercel --prod
```

---

## ✅ Verification Checklist

Once deployed, verify:

1. **Visit your Vercel URL** (shown after deployment)
   - Should look like: `https://irb-management-system-prod.vercel.app`

2. **Test these pages:**
   - ✅ Homepage: `https://your-app.vercel.app`
   - ✅ Login: `https://your-app.vercel.app/login`
   - ✅ API Health: `https://your-app.vercel.app/api/health`

3. **Check logs:**
   ```bash
   vercel logs
   ```

4. **Check deployments:**
   ```bash
   vercel ls
   ```

---

## 🎯 Quick Commands Reference

```bash
# Login
vercel login

# Deploy to production (fresh)
vercel --prod

# List all deployments
vercel ls

# View logs
vercel logs

# View specific deployment
vercel inspect [deployment-url]

# Open in browser
vercel --prod --open

# Remove old deployment
vercel remove [deployment-name]
```

---

## 🔄 Continuous Deployment (Recommended)

Once your GitHub repo is connected:
- Every push to `main` = automatic production deployment
- Every PR = automatic preview deployment
- Zero configuration needed!

---

## 💡 Tips

1. **Custom Domain** (optional):
   - Dashboard → Settings → Domains
   - Add your domain
   - Update DNS as instructed

2. **Team Collaboration**:
   - Dashboard → Settings → Members
   - Invite team members

3. **Environment Variables per Environment**:
   - Production: For `main` branch
   - Preview: For pull requests
   - Development: For local development

---

## 🆘 Troubleshooting

**Issue: Build fails**
- Check build logs in Vercel dashboard
- Verify `npm run build` works locally first
- Check all dependencies are in package.json

**Issue: Can't login with CLI**
- Run `vercel logout` then `vercel login` again
- Or use dashboard method instead

**Issue: Environment variables not working**
- Verify they're set for "Production" environment
- Redeploy after adding variables
- Check variable names match exactly (case-sensitive)

---

## 🎉 You're Ready!

Choose your method:

### Quick & Easy (Dashboard):
1. Go to https://vercel.com/jeff-banders-projects
2. Click "Add New" → "Project"
3. Import your GitHub repo
4. Add environment variables
5. Deploy!

### Command Line (CLI):
```bash
cd "C:\Users\jeffr\IRB try 2"
vercel login
vercel --prod
```

---

**Current Status:**
- ✅ Old Vercel config cleaned
- ✅ Project ready to deploy
- ✅ Build tested and working
- ✅ Environment variables prepared

**Next Step:** Choose dashboard or CLI method above!
