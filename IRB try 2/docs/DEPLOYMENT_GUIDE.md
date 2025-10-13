# IRB Management System - Production Deployment Guide

This comprehensive guide walks you through deploying the IRB Management System to Google Cloud Platform (Cloud Run + Cloud SQL) with full CI/CD automation.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Prerequisites](#prerequisites)
3. [Initial Setup](#initial-setup)
4. [Database Migration](#database-migration)
5. [Deployment Process](#deployment-process)
6. [Post-Deployment](#post-deployment)
7. [Monitoring & Maintenance](#monitoring--maintenance)
8. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

### Production Stack

```
┌─────────────────────────────────────────────────────────────┐
│                        GitHub Actions                         │
│                    (CI/CD Automation)                         │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
         ┌───────────────────────┐
         │  Google Cloud Run     │
         │  (Next.js App)        │
         │  - Auto-scaling       │
         │  - Zero-downtime      │
         │  - Health checks      │
         └───────────┬───────────┘
                     │
                     ▼
         ┌───────────────────────┐
         │  Cloud SQL            │
         │  (PostgreSQL 16)      │
         │  - Automated backups  │
         │  - High availability  │
         │  - SSL connections    │
         └───────────────────────┘
                     │
         ┌───────────┴───────────┐
         │                       │
    ┌────▼────┐           ┌─────▼─────┐
    │ Cloud   │           │  Secret   │
    │ Storage │           │  Manager  │
    │ (Files) │           │ (Secrets) │
    └─────────┘           └───────────┘
```

### Key Features

- **Zero-downtime deployments** with gradual traffic rollout
- **Automatic rollback** on health check failures
- **Automated testing** in CI pipeline (lint, unit, E2E)
- **Database migrations** as part of deployment
- **Secret management** via GCP Secret Manager
- **Monitoring & logging** with Cloud Logging
- **Cost-optimized** auto-scaling configuration

---

## Prerequisites

### Required Tools

1. **Google Cloud SDK**
   ```bash
   # macOS
   brew install google-cloud-sdk

   # Windows
   # Download from https://cloud.google.com/sdk/docs/install

   # Verify installation
   gcloud --version
   ```

2. **Terraform**
   ```bash
   # macOS
   brew install terraform

   # Windows
   choco install terraform

   # Verify installation
   terraform --version
   ```

3. **Docker**
   ```bash
   # Install Docker Desktop
   # https://www.docker.com/products/docker-desktop

   # Verify installation
   docker --version
   ```

4. **Node.js 18+**
   ```bash
   node --version
   npm --version
   ```

### GCP Account Setup

1. **Create GCP Account**
   - Go to https://console.cloud.google.com
   - Sign up or log in
   - Enable billing (required for Cloud Run and Cloud SQL)

2. **Create Projects**
   ```bash
   # Create staging project
   gcloud projects create irb-system-staging --name="IRB System Staging"

   # Create production project
   gcloud projects create irb-system-production --name="IRB System Production"
   ```

3. **Enable Billing**
   - Go to: https://console.cloud.google.com/billing
   - Link billing account to both projects

4. **Authenticate**
   ```bash
   gcloud auth login
   gcloud auth application-default login
   ```

---

## Initial Setup

### Step 1: Configure GitHub Secrets

Go to your GitHub repository > Settings > Secrets and variables > Actions

Add the following secrets:

#### Staging Secrets
```
GCP_PROJECT_ID_STAGING=irb-system-staging
GCP_SA_KEY_STAGING=<service-account-key-json>
DATABASE_URL_STAGING=<will-be-generated-by-terraform>
JWT_SECRET_STAGING=<generate-with-openssl>
AIGENTS_WEBHOOK_SECRET_STAGING=<your-webhook-secret>
```

#### Production Secrets
```
GCP_PROJECT_ID_PRODUCTION=irb-system-production
GCP_SA_KEY_PRODUCTION=<service-account-key-json>
DATABASE_URL_PRODUCTION=<will-be-generated-by-terraform>
JWT_SECRET_PRODUCTION=<generate-with-openssl>
AIGENTS_WEBHOOK_SECRET_PRODUCTION=<your-webhook-secret>
PRODUCTION_URL=<will-be-set-after-first-deploy>
```

#### Shared Secrets
```
AIGENTS_API_URL=https://start-chain-run-943506065004.us-central1.run.app
AIGENTS_EMAIL=notifications@providerloop.com
AIGENTS_FOLDER_ID=<your-appsheet-folder-id>
CODECOV_TOKEN=<optional-for-code-coverage>
```

### Step 2: Generate Service Account Keys

```bash
# For staging
gcloud iam service-accounts create github-actions-staging \
    --project=irb-system-staging \
    --display-name="GitHub Actions Staging"

gcloud projects add-iam-policy-binding irb-system-staging \
    --member="serviceAccount:github-actions-staging@irb-system-staging.iam.gserviceaccount.com" \
    --role="roles/owner"

gcloud iam service-accounts keys create ./staging-key.json \
    --iam-account=github-actions-staging@irb-system-staging.iam.gserviceaccount.com

# For production (repeat with production project)
gcloud iam service-accounts create github-actions-production \
    --project=irb-system-production \
    --display-name="GitHub Actions Production"

gcloud projects add-iam-policy-binding irb-system-production \
    --member="serviceAccount:github-actions-production@irb-system-production.iam.gserviceaccount.com" \
    --role="roles/owner"

gcloud iam service-accounts keys create ./production-key.json \
    --iam-account=github-actions-production@irb-system-production.iam.gserviceaccount.com
```

Copy the contents of `staging-key.json` and `production-key.json` to GitHub Secrets as `GCP_SA_KEY_STAGING` and `GCP_SA_KEY_PRODUCTION`.

**IMPORTANT**: Delete these files after copying to GitHub Secrets!

```bash
rm staging-key.json production-key.json
```

### Step 3: Generate Secrets

```bash
# Generate JWT secrets (do this twice, once for staging, once for production)
openssl rand -base64 64

# Generate webhook secret
openssl rand -hex 32
```

Add these to GitHub Secrets.

### Step 4: Deploy Infrastructure with Terraform

```bash
# Navigate to terraform directory
cd terraform

# Configure for staging
cp terraform.tfvars.example terraform.staging.tfvars

# Edit terraform.staging.tfvars with your values
nano terraform.staging.tfvars
```

Example `terraform.staging.tfvars`:
```hcl
project_id              = "irb-system-staging"
region                  = "us-central1"
environment             = "staging"
db_instance_tier        = "db-f1-micro"
db_disk_size            = 10
db_backup_enabled       = true
cloud_run_min_instances = 0
cloud_run_max_instances = 10
cloud_run_memory        = "512Mi"
cloud_run_cpu           = "1"
```

Deploy infrastructure:
```bash
# Initialize Terraform
terraform init

# Plan infrastructure
terraform plan -var-file="terraform.staging.tfvars"

# Apply (creates resources)
terraform apply -var-file="terraform.staging.tfvars"
```

This takes about 10-15 minutes (Cloud SQL creation is slow).

### Step 5: Setup GCP Secrets

After Terraform completes, set up additional secrets:

```bash
chmod +x scripts/setup-gcp-secrets.sh
./scripts/setup-gcp-secrets.sh staging
```

Follow the prompts to enter:
- Database URL (get from Terraform output)
- JWT Secret
- Aigents webhook secret
- Aigents folder ID
- Other configuration values

---

## Database Migration

### Migrate from SQLite to PostgreSQL

If you have existing data in SQLite:

```bash
# Set environment variables
export SQLITE_DATABASE_URL="file:./prisma/dev.db"
export POSTGRES_DATABASE_URL="<your-postgres-connection-string>"

# Run migration script
node scripts/migrate-sqlite-to-postgres.js
```

### Initial Database Setup

For a fresh database:

```bash
# Set DATABASE_URL (get from Terraform output)
export DATABASE_URL="<your-postgres-connection-string>"

# Generate Prisma client for PostgreSQL
npx prisma generate --schema=prisma/schema.production.prisma

# Run migrations
npx prisma migrate deploy --schema=prisma/schema.production.prisma

# Seed database (optional)
npx prisma db seed
```

---

## Deployment Process

### Automatic Deployment (Recommended)

#### Staging (Auto-deploy on push to develop)

```bash
# Simply push to develop branch
git checkout develop
git add .
git commit -m "feat: your changes"
git push origin develop
```

GitHub Actions will automatically:
1. Run linting and type checking
2. Run unit tests
3. Run E2E tests
4. Build Docker image
5. Run database migrations
6. Deploy to Cloud Run
7. Run health checks
8. Notify on failure

#### Production (Manual approval required)

1. Go to GitHub Actions
2. Select "Deploy to Production" workflow
3. Click "Run workflow"
4. Type `deploy-to-production` to confirm
5. Click "Run workflow"

The workflow will:
1. Run full test suite
2. Build and push Docker image
3. Run database migrations
4. Deploy new revision with 0% traffic
5. Gradually migrate traffic: 10% → 50% → 100%
6. Monitor health checks at each stage
7. Automatically rollback on failure
8. Tag successful deployments

### Manual Deployment

If you need to deploy manually:

#### Staging

```bash
chmod +x scripts/deploy-staging.sh
./scripts/deploy-staging.sh
```

#### Production

```bash
chmod +x scripts/deploy-production.sh
./scripts/deploy-production.sh
```

---

## Post-Deployment

### Verify Deployment

1. **Check Service URL**
   ```bash
   # Get Cloud Run URL
   gcloud run services describe irb-system-staging \
       --platform managed \
       --region us-central1 \
       --format 'value(status.url)'
   ```

2. **Test Health Endpoint**
   ```bash
   curl https://your-service-url/api/health
   ```

3. **Test Authentication**
   ```bash
   curl -X POST https://your-service-url/api/auth \
       -H "Content-Type: application/json" \
       -d '{"email":"admin@example.com","password":"your-password"}'
   ```

### Update GitHub Secrets

Add the service URL to GitHub Secrets:
```
PRODUCTION_URL=https://your-production-url.run.app
```

### Setup Custom Domain (Optional)

1. **Map Domain in Cloud Run**
   ```bash
   gcloud run domain-mappings create \
       --service irb-system-production \
       --domain irb.yourdomain.com \
       --region us-central1
   ```

2. **Update DNS Records**
   Follow the instructions provided by GCP to add DNS records.

3. **Enable SSL**
   SSL is automatically provisioned by Cloud Run (may take 15 minutes).

---

## Monitoring & Maintenance

### View Logs

```bash
# Real-time logs
gcloud run services logs tail irb-system-staging --region us-central1

# Recent logs
gcloud run services logs read irb-system-staging --region us-central1 --limit 50
```

### Cloud Console Dashboards

1. **Cloud Run Metrics**
   - https://console.cloud.google.com/run
   - View: Request count, latency, errors, CPU, memory

2. **Cloud SQL Monitoring**
   - https://console.cloud.google.com/sql
   - View: Connections, CPU, memory, disk I/O

3. **Logs Explorer**
   - https://console.cloud.google.com/logs
   - Advanced filtering and analysis

### Database Backups

Backups are automated (configured in Terraform):
- Daily at 3:00 AM UTC
- 7-day retention
- Point-in-time recovery (production)

#### Manual Backup

```bash
gcloud sql backups create \
    --instance=irb-system-staging-db \
    --description="Manual backup before major update"
```

#### Restore from Backup

```bash
# List backups
gcloud sql backups list --instance=irb-system-staging-db

# Restore
gcloud sql backups restore BACKUP_ID \
    --backup-instance=irb-system-staging-db
```

### Cost Monitoring

1. **View Current Costs**
   - https://console.cloud.google.com/billing

2. **Set Budget Alerts**
   ```bash
   # Create budget alert at $100/month
   gcloud billing budgets create \
       --billing-account=YOUR_BILLING_ACCOUNT \
       --display-name="IRB System Monthly Budget" \
       --budget-amount=100USD \
       --threshold-rule=percent=90
   ```

### Health Checks

Health checks run automatically every 30 seconds. Configure alerts:

```bash
# Create uptime check
gcloud monitoring uptime create \
    --resource-type="uptime-url" \
    --display-name="IRB System Health" \
    --http-check-path="/api/health" \
    --period=60
```

---

## Troubleshooting

### Common Issues

#### 1. Deployment Fails - Database Connection Error

**Symptom**: Cloud Run logs show database connection errors

**Solution**:
```bash
# Verify database is running
gcloud sql instances describe irb-system-staging-db

# Check connection name is correct in secrets
gcloud secrets versions access latest --secret=DATABASE_URL_STAGING

# Verify Cloud Run has proper IAM permissions
gcloud projects get-iam-policy irb-system-staging
```

#### 2. Health Check Failures

**Symptom**: Deployment rollback due to health check failures

**Solution**:
```bash
# View Cloud Run logs
gcloud run services logs read irb-system-staging --limit 100

# Test health endpoint locally
curl https://your-service-url/api/health

# Check Cloud Run service configuration
gcloud run services describe irb-system-staging --region us-central1
```

#### 3. Out of Memory Errors

**Symptom**: Cloud Run instances crash with OOM errors

**Solution**:
```bash
# Increase memory allocation
gcloud run services update irb-system-staging \
    --memory 1Gi \
    --region us-central1
```

Or update Terraform configuration:
```hcl
cloud_run_memory = "1Gi"
```

#### 4. Slow Database Queries

**Symptom**: High response times, database CPU at 100%

**Solution**:
```bash
# Check slow queries in Cloud SQL
# Go to: https://console.cloud.google.com/sql/instances/INSTANCE/query-insights

# Upgrade instance tier
# Edit terraform/terraform.staging.tfvars:
db_instance_tier = "db-n1-standard-1"

# Apply change
terraform apply -var-file="terraform.staging.tfvars"
```

#### 5. CI Pipeline Failures

**Symptom**: GitHub Actions fail

**Solution**:
```bash
# Check GitHub Actions logs
# Go to: https://github.com/YOUR_REPO/actions

# Common fixes:
# - Update Node.js version in workflows
# - Check GitHub Secrets are set correctly
# - Verify service account permissions
```

### Rollback Procedure

If a deployment causes issues:

```bash
# Quick rollback
chmod +x scripts/rollback.sh
./scripts/rollback.sh staging
# or
./scripts/rollback.sh production
```

Manual rollback:
```bash
# List revisions
gcloud run revisions list \
    --service irb-system-staging \
    --region us-central1

# Rollback to specific revision
gcloud run services update-traffic irb-system-staging \
    --to-revisions REVISION_NAME=100 \
    --region us-central1
```

### Emergency Procedures

#### Full System Outage

1. Check Cloud Run status
2. Check Cloud SQL status
3. Check recent deployments
4. Rollback if recent deployment
5. Check logs for errors
6. Scale up if needed

```bash
# Force scale up
gcloud run services update irb-system-production \
    --min-instances 2 \
    --region us-central1
```

#### Database Emergency

```bash
# Stop all traffic to prevent data corruption
gcloud run services update irb-system-production \
    --no-traffic \
    --region us-central1

# Restore from backup
gcloud sql backups restore BACKUP_ID \
    --backup-instance=irb-system-production-db

# Resume traffic
gcloud run services update-traffic irb-system-production \
    --to-latest \
    --region us-central1
```

---

## Next Steps After Deployment

1. **Configure Monitoring Alerts**
   - Set up email/SMS alerts for errors
   - Configure uptime monitoring
   - Set budget alerts

2. **Security Hardening**
   - Enable Cloud Armor (WAF)
   - Configure VPC Service Controls
   - Enable Cloud Security Command Center

3. **Performance Optimization**
   - Enable Cloud CDN for static assets
   - Configure connection pooling
   - Set up Redis for caching

4. **Compliance**
   - Configure audit logging
   - Set up data retention policies
   - Enable encryption at rest

5. **Team Onboarding**
   - Document access procedures
   - Train team on deployment process
   - Set up on-call rotation

---

## Support & Resources

- **GCP Documentation**: https://cloud.google.com/docs
- **Cloud Run Docs**: https://cloud.google.com/run/docs
- **Cloud SQL Docs**: https://cloud.google.com/sql/docs
- **Terraform Registry**: https://registry.terraform.io/providers/hashicorp/google/latest/docs

For issues specific to this project, contact the development team or open an issue in the repository.
