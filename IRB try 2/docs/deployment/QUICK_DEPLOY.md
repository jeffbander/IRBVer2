# Quick Deploy Guide

Fast-track deployment instructions for Firebase and Netlify.

## 🚀 Quick Start

### Firebase (5 minutes)

1. **Install Firebase CLI**
   ```bash
   npm install -g firebase-tools
   firebase login
   ```

2. **Configure Project**
   - Edit `.firebaserc` and update your project ID
   - Set environment variables:
   ```bash
   firebase functions:config:set database.url="YOUR_DATABASE_URL"
   firebase functions:config:set jwt.secret="YOUR_JWT_SECRET"
   ```

3. **Deploy**
   ```bash
   npm run deploy:firebase
   ```
   Or use the batch script:
   ```bash
   deploy-firebase.bat
   ```

### Netlify (3 minutes)

#### Option A: Git Integration (Recommended)
1. Push to GitHub
2. Go to [Netlify](https://app.netlify.com)
3. "New site from Git" → Select your repo
4. Set environment variables in dashboard
5. Deploy!

#### Option B: CLI
1. **Install Netlify CLI**
   ```bash
   npm install -g netlify-cli
   netlify login
   ```

2. **Deploy**
   ```bash
   npm run deploy:netlify
   ```
   Or use the batch script:
   ```bash
   deploy-netlify.bat
   ```

---

## 📝 Required Environment Variables

Set these in your deployment platform:

```env
DATABASE_URL="postgresql://user:pass@host:5432/db"
JWT_SECRET="your-secret-min-32-chars"
SESSION_SECRET="your-session-secret"
AIGENTS_API_URL="https://start-chain-run-943506065004.us-central1.run.app"
AIGENTS_EMAIL="notifications@providerloop.com"
```

### Firebase
```bash
firebase functions:config:set database.url="..." jwt.secret="..." session.secret="..."
```

### Netlify
Dashboard → Site settings → Environment variables → Add variables

---

## 🗄️ Database Options

### Quick Options (with free tiers):

1. **Supabase** (Recommended)
   - Sign up at [supabase.com](https://supabase.com)
   - Create project → Get connection string
   - Set as `DATABASE_URL`

2. **Railway**
   - Sign up at [railway.app](https://railway.app)
   - New Project → PostgreSQL
   - Copy connection string

3. **PlanetScale**
   - Sign up at [planetscale.com](https://planetscale.com)
   - Create database → Get connection string

After setting up database:
```bash
npx prisma migrate deploy
```

---

## ✅ Verify Deployment

1. Visit your deployed URL
2. Check login page works
3. Test API health endpoint: `/api/health`
4. Create test user and login

---

## 🆘 Troubleshooting

**Build fails?**
```bash
npm install
npx prisma generate
npm run build
```

**Can't connect to database?**
- Check `DATABASE_URL` is set correctly
- Ensure database accepts connections from deployment platform
- Add `?schema=public` to PostgreSQL connection string

**Functions timeout?**
- Check database connection
- Verify environment variables are set
- Check function logs in platform dashboard

---

## 📚 Full Documentation

- [Complete Firebase & Netlify Guide](./DEPLOYMENT_FIREBASE_NETLIFY.md)
- [Docker Deployment](./DEPLOYMENT.md)

---

## 🔒 Security Checklist

Before going live:
- [ ] Change default admin password
- [ ] Set strong JWT_SECRET (32+ characters)
- [ ] Enable HTTPS
- [ ] Set environment variables
- [ ] Run database migrations
- [ ] Test all major features
- [ ] Set up monitoring

---

## 💰 Cost Estimates

### Firebase Free Tier
- 125K function invocations/month
- 10GB bandwidth/month
- Usually free for small apps

### Netlify Free Tier
- 100GB bandwidth/month
- 300 build minutes/month
- Perfect for most use cases

Both platforms scale automatically as you grow.

---

## Need Help?

Check the troubleshooting section in:
- [DEPLOYMENT_FIREBASE_NETLIFY.md](./DEPLOYMENT_FIREBASE_NETLIFY.md)

Happy deploying! 🎉
