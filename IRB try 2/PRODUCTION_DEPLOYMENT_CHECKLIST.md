# Production Deployment Checklist

## Security Fixes Completed ✅

### Authentication & Authorization
- [x] JWT tokens moved from localStorage to httpOnly cookies (XSS protection)
- [x] CSRF protection implemented with double-submit cookie pattern
- [x] Rate limiting updated for cookie-based authentication
- [x] Logout endpoint clears cookies properly
- [x] Admin role assignment bug fixed in seed script

### File Upload Security
- [x] Magic number verification prevents file type spoofing
- [x] Filename sanitization prevents directory traversal
- [x] MIME type and extension validation
- [x] File size limits by type
- [ ] **TODO**: Integrate ClamAV for virus scanning (production)

### Input Validation
- [x] Server-side email validation (RFC 5322 compliant)
- [x] Password strength requirements (8+ chars, mixed case, numbers)
- [x] HTML sanitization to prevent XSS
- [x] Entity-specific validators for API endpoints

### Infrastructure
- [x] Health check endpoint for Docker/Cloud Run
- [x] Rate limiting implemented
- [ ] **TODO**: Replace in-memory rate limiting with Redis (production)

---

## Pre-Deployment Tasks

### Environment Configuration
- [ ] Set `NODE_ENV=production`
- [ ] Generate secure `JWT_SECRET` (use: `openssl rand -base64 32`)
- [ ] Configure database URL for production (PostgreSQL)
- [ ] Set up Redis for production rate limiting
- [ ] Configure cloud storage for file uploads (GCS/S3)
- [ ] Set CORS allowed origins
- [ ] Configure monitoring/logging (Sentry, Datadog, etc.)

### Database Migration
- [ ] Backup development database
- [ ] Test SQLite → PostgreSQL migration locally
- [ ] Run `npx prisma migrate deploy` in production
- [ ] Verify all data migrated correctly
- [ ] Set up automated backups

### File Storage
- [ ] Migrate from local filesystem to cloud storage
- [ ] Update file upload paths in code
- [ ] Configure bucket permissions (GCS/S3)
- [ ] Set up CDN if needed (CloudFront/Cloud CDN)

### Security Hardening
- [ ] Install and configure ClamAV for virus scanning
- [ ] Set up WAF rules (Cloud Armor/AWS WAF)
- [ ] Configure HTTPS/TLS certificates
- [ ] Enable security headers:
  - [ ] `Strict-Transport-Security`
  - [ ] `X-Frame-Options`
  - [ ] `X-Content-Type-Options`
  - [ ] `Content-Security-Policy`
- [ ] Review and tighten CORS settings
- [ ] Set up DDoS protection

### HIPAA Compliance
- [ ] Sign BAA (Business Associate Agreement) with cloud provider
- [ ] Enable encryption at rest for database
- [ ] Enable encryption in transit (TLS 1.2+)
- [ ] Configure audit logging to immutable storage
- [ ] Set up access controls and IAM policies
- [ ] Implement PHI data retention policies
- [ ] Configure automatic security patches
- [ ] Set up intrusion detection (IDS)

### Code Review
- [ ] Run security audit: `npm audit`
- [ ] Fix all critical and high vulnerabilities
- [ ] Review all API endpoints for authorization checks
- [ ] Verify CSRF protection on all state-changing endpoints
- [ ] Check for hardcoded secrets (use secret manager)
- [ ] Review error messages (don't leak sensitive info)

### Testing
- [x] Run Playwright test suite
- [ ] Fix all failing tests
- [ ] Run load tests
- [ ] Test backup/restore procedures
- [ ] Verify monitoring/alerting works
- [ ] Test disaster recovery plan

### Performance
- [ ] Enable Next.js production optimizations
- [ ] Configure CDN for static assets
- [ ] Set up database connection pooling
- [ ] Implement caching strategy (Redis)
- [ ] Optimize image delivery
- [ ] Enable gzip/brotli compression

### Monitoring & Logging
- [ ] Set up application monitoring (APM)
- [ ] Configure error tracking (Sentry)
- [ ] Set up log aggregation (CloudWatch/Stackdriver)
- [ ] Create dashboards for key metrics
- [ ] Set up alerts for:
  - [ ] Error rates > threshold
  - [ ] Response time > threshold
  - [ ] Failed login attempts
  - [ ] Unusual traffic patterns
  - [ ] Database connection issues
  - [ ] Disk space warnings

---

## Deployment Platforms

### Option 1: Google Cloud Platform (Recommended for HIPAA)
**Advantages**:
- HIPAA compliant with BAA
- Cloud Run (serverless) or GKE (Kubernetes)
- Cloud SQL for PostgreSQL
- Cloud Storage for files
- Cloud Armor for WAF
- Good pricing for healthcare apps

**Setup**:
```bash
# Install gcloud CLI
gcloud init

# Build and deploy
gcloud run deploy irb-system \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars NODE_ENV=production

# Set up Cloud SQL
gcloud sql instances create irb-db \
  --database-version=POSTGRES_14 \
  --tier=db-f1-micro \
  --region=us-central1

# Configure Cloud Storage
gsutil mb -l us-central1 gs://irb-documents
```

### Option 2: Firebase (Good for rapid deployment)
**Advantages**:
- Easy setup
- Good for smaller apps
- Integrated auth
- Realtime capabilities

**Limitations**:
- Not HIPAA compliant out of box
- Need GCP for HIPAA

### Option 3: Vercel (Fast deployment)
**Advantages**:
- Excellent Next.js support
- Easy deployment
- Good DX

**Limitations**:
- NOT HIPAA compliant
- **Do not use for production IRB system with PHI**

---

## Post-Deployment

### Immediate
- [ ] Verify health check endpoint
- [ ] Test login/logout flows
- [ ] Verify file uploads work
- [ ] Check database connections
- [ ] Verify audit logging
- [ ] Test all critical user flows

### First Week
- [ ] Monitor error rates
- [ ] Review security logs
- [ ] Check performance metrics
- [ ] Review cost/usage
- [ ] Gather user feedback
- [ ] Schedule security review

### Ongoing
- [ ] Weekly security patch reviews
- [ ] Monthly security audits
- [ ] Quarterly penetration testing
- [ ] Regular backup testing
- [ ] Update dependencies monthly
- [ ] Review access logs for anomalies

---

## Emergency Contacts

- [ ] Set up on-call rotation
- [ ] Document incident response procedures
- [ ] Create runbook for common issues
- [ ] Establish escalation procedures

---

## Compliance Documentation

- [ ] Create privacy policy
- [ ] Create terms of service
- [ ] Document data retention policies
- [ ] Document incident response plan
- [ ] Create security training materials
- [ ] Document BAA with all vendors

---

## Cost Estimates (GCP)

**Small Scale (< 100 users)**:
- Cloud Run: $10-30/month
- Cloud SQL (db-f1-micro): $10/month
- Cloud Storage: $5/month
- Redis (Memorystore): $30/month
- **Total**: ~$55-75/month

**Medium Scale (100-1000 users)**:
- Cloud Run: $50-150/month
- Cloud SQL (db-n1-standard-1): $50/month
- Cloud Storage: $20/month
- Redis (Memorystore): $50/month
- **Total**: ~$170-270/month

**Add-ons**:
- ClamAV scanning: +$20/month
- Enhanced monitoring: +$30/month
- CDN: +$10-50/month

---

## Deployment Commands

### Build for Production
```bash
# Install dependencies
npm ci

# Generate Prisma client
npx prisma generate

# Build Next.js
npm run build

# Test build locally
npm start
```

### Docker Deployment
```bash
# Build image
docker build -t irb-system:latest .

# Run locally
docker run -p 3000:3000 \
  -e DATABASE_URL=postgresql://... \
  -e NODE_ENV=production \
  irb-system:latest

# Push to registry
docker tag irb-system gcr.io/PROJECT-ID/irb-system
docker push gcr.io/PROJECT-ID/irb-system
```

---

## Rollback Plan

1. Keep previous deployment available
2. Document database schema changes
3. Have database backup before deployment
4. Test rollback procedure in staging
5. Keep environment variables versioned

**Rollback Commands** (GCP):
```bash
# List revisions
gcloud run revisions list

# Rollback to previous
gcloud run services update-traffic irb-system \
  --to-revisions=PREVIOUS-REVISION=100
```

---

## Security Incident Response

1. **Detect**: Monitoring alerts trigger
2. **Assess**: Determine severity and scope
3. **Contain**: Isolate affected systems
4. **Eradicate**: Remove threat
5. **Recover**: Restore normal operations
6. **Report**: Document and report as required by HIPAA
7. **Review**: Post-mortem and improvements

---

Last Updated: 2025-10-30
Version: 1.0
