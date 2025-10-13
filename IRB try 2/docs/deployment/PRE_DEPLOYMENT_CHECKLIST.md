# Pre-Deployment Checklist

Complete this checklist before deploying to production.

## 📋 Pre-Deployment Steps

### 1. Code & Dependencies
- [ ] All dependencies are up to date (`npm update`)
- [ ] No critical security vulnerabilities (`npm audit`)
- [ ] Code is committed to Git
- [ ] All tests pass (`npm test` and `npm run test:e2e`)
- [ ] Build succeeds locally (`npm run build`)

### 2. Environment Configuration
- [ ] `.env.example` is updated with all required variables
- [ ] Production environment variables are prepared
- [ ] `JWT_SECRET` is strong (32+ characters, random)
- [ ] `SESSION_SECRET` is strong (32+ characters, random)
- [ ] Database connection string is ready
- [ ] AIGENTS API credentials are configured

### 3. Database Setup
- [ ] Production database is created
- [ ] Database is accessible from deployment platform
- [ ] Connection pooling is configured (if using PostgreSQL)
- [ ] Backup strategy is in place
- [ ] Migrations are tested
  ```bash
  npx prisma migrate deploy
  ```

### 4. Platform-Specific Setup

#### Firebase
- [ ] Firebase CLI installed (`npm install -g firebase-tools`)
- [ ] Firebase project created
- [ ] `.firebaserc` updated with project ID
- [ ] Environment variables set in Firebase:
  ```bash
  firebase functions:config:set database.url="..."
  firebase functions:config:set jwt.secret="..."
  firebase functions:config:set session.secret="..."
  ```
- [ ] Cloud SQL configured (if using)
- [ ] Billing account enabled (for production workloads)

#### Netlify
- [ ] Netlify CLI installed (`npm install -g netlify-cli`)
- [ ] Site created in Netlify dashboard
- [ ] Environment variables set in Netlify dashboard
- [ ] Build settings configured:
  - Build command: `npm run build`
  - Publish directory: `.next`
  - Node version: 20
- [ ] Git repository connected (for auto-deploy)

### 5. Security
- [ ] All secrets are unique and not defaults
- [ ] HTTPS is enabled (automatic with Firebase/Netlify)
- [ ] CORS is configured properly
- [ ] Rate limiting is enabled
- [ ] File upload limits are set
- [ ] Admin password will be changed after first login
- [ ] Sensitive files are in `.gitignore`

### 6. Testing
- [ ] Build succeeds without errors
- [ ] All routes are accessible
- [ ] Authentication works
- [ ] Database operations work
- [ ] File uploads work (if applicable)
- [ ] API endpoints respond correctly
- [ ] Error handling works as expected

---

## 🚀 Deployment Commands

### Firebase
```bash
# Test build first
npm run build

# Deploy
npm run deploy:firebase
# Or use batch script
deploy-firebase.bat
```

### Netlify
```bash
# Test build first
npm run build

# Deploy via CLI
npm run deploy:netlify
# Or use batch script
deploy-netlify.bat

# Or use Git (recommended)
git push origin main
```

---

## ✅ Post-Deployment Verification

### Immediately After Deployment
1. [ ] Site is accessible at deployed URL
2. [ ] Home page loads without errors
3. [ ] Static assets load correctly
4. [ ] API health check responds: `/api/health`
5. [ ] Database connection works
6. [ ] Can access login page
7. [ ] Can log in with admin credentials
8. [ ] Can create new study
9. [ ] Can upload documents
10. [ ] All main features work

### Within 24 Hours
1. [ ] Monitor error logs for issues
2. [ ] Check performance metrics
3. [ ] Verify email notifications work (if configured)
4. [ ] Test from different devices/browsers
5. [ ] Change default admin password
6. [ ] Set up monitoring/alerting
7. [ ] Configure backups
8. [ ] Document deployment details

### Security Review
1. [ ] No sensitive data in logs
2. [ ] HTTPS is enforced
3. [ ] Authentication is working
4. [ ] Authorization is working
5. [ ] Rate limiting is active
6. [ ] Error messages don't leak sensitive info

---

## 🔧 Configuration Review

### Firebase Specific
```bash
# Verify Firebase config
firebase functions:config:get

# Check deployment status
firebase deploy --only hosting,functions --dry-run

# View logs
firebase functions:log
```

### Netlify Specific
```bash
# Verify environment variables
netlify env:list

# Check build logs
netlify watch

# View function logs
netlify functions:log
```

### Database
```bash
# Verify migrations
npx prisma migrate status

# Check database connection
npx prisma studio

# View database structure
npx prisma db pull
```

---

## 📊 Performance Checklist

- [ ] Images are optimized
- [ ] Static assets are cached
- [ ] Database queries are optimized
- [ ] Indexes are created on frequently queried fields
- [ ] Connection pooling is configured
- [ ] Rate limiting prevents abuse

---

## 🆘 Rollback Plan

If deployment fails:

### Firebase
```bash
# View previous deployments
firebase hosting:channel:list

# Rollback to previous version (if needed)
# Contact Firebase support for rollback assistance
```

### Netlify
```bash
# Rollback in dashboard
# Go to Deploys → Select previous deploy → Publish

# Or via CLI
netlify rollback
```

### Database
```bash
# Restore from backup
# (Ensure you have recent backup before deploying!)
```

---

## 📞 Support Resources

### Firebase
- [Firebase Console](https://console.firebase.google.com)
- [Firebase Documentation](https://firebase.google.com/docs)
- [Firebase Support](https://firebase.google.com/support)

### Netlify
- [Netlify Dashboard](https://app.netlify.com)
- [Netlify Documentation](https://docs.netlify.com)
- [Netlify Support](https://www.netlify.com/support/)

### General
- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)

---

## 📝 Deployment Log Template

Document your deployment:

```
Deployment Date: _______________
Platform: [ ] Firebase  [ ] Netlify
Deployed By: _______________
Version/Commit: _______________
Database: _______________
Environment Variables Set: [ ] Yes  [ ] No
Migrations Run: [ ] Yes  [ ] No
Post-Deploy Tests Passed: [ ] Yes  [ ] No
Issues Encountered: _______________
Resolution: _______________
Deployed URL: _______________
Notes: _______________
```

---

## 🎉 Ready to Deploy?

Once all items are checked:

1. Run final build test: `npm run build`
2. Commit all changes: `git add . && git commit -m "Ready for deployment"`
3. Push to repository: `git push`
4. Deploy using chosen method
5. Verify deployment using post-deployment checklist
6. Monitor for first 24 hours
7. Celebrate! 🎉

---

**Remember:** Always test in a staging environment first if possible!
