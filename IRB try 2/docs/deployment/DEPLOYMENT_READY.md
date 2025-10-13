# IRB Management System - Production Deployment Package

## Overview

This repository is now **PRODUCTION READY** with a complete deployment infrastructure for Google Cloud Platform (Cloud Run + Cloud SQL). All necessary files, configurations, and documentation have been created for enterprise-grade deployment.

## What Has Been Created

### 1. CI/CD Pipeline (GitHub Actions)

#### `.github/workflows/ci.yml` - Continuous Integration
- Automated linting and type checking
- Unit tests with coverage reporting
- Database migration testing
- E2E tests with Playwright
- Docker build and health check tests
- Security scanning with Trivy
- Runs on every push and pull request

#### `.github/workflows/deploy-staging.yml` - Staging Deployment
- **Automatic deployment** on push to `develop` branch
- Full test suite execution
- Docker image build and push to GCR
- Database migration execution
- Cloud Run deployment with health checks
- Automatic rollback on failure
- Zero-downtime deployment

#### `.github/workflows/deploy-production.yml` - Production Deployment
- **Manual approval required** (type "deploy-to-production" to confirm)
- Complete test suite (lint, unit, E2E)
- Docker image build with version tagging
- Production database migrations
- **Gradual traffic rollout**: 0% → 10% → 50% → 100%
- Health checks at each stage
- Automatic rollback on failure
- Git tagging for successful deployments

### 2. Docker Configuration

#### `Dockerfile.production` - Production-Optimized Container
- Multi-stage build for minimal image size
- Next.js standalone output
- Non-root user for security
- Health check endpoint
- Optimized for Cloud Run (Port 8080)
- PostgreSQL support

#### `docker-compose.production.yml` - Full Stack Deployment
- Application container
- PostgreSQL database
- pgAdmin (optional, for database management)
- Volume management for data persistence
- Network isolation
- Health checks for all services

#### Updated `next.config.js`
- Production optimizations
- Security headers (HSTS, X-Frame-Options, CSP, etc.)
- SWC minification
- Image optimization
- Compression enabled

### 3. Database Configuration

#### `prisma/schema.production.prisma` - PostgreSQL Schema
- Production-ready schema for PostgreSQL 16
- Proper indexes for performance
- Table name mapping (@map)
- Support for Cloud SQL connection strings

#### `scripts/migrate-sqlite-to-postgres.js` - Migration Script
- Automated migration from SQLite to PostgreSQL
- Preserves all data and relationships
- Handles all models (Users, Studies, Participants, etc.)
- Transaction safety
- Error handling

#### `scripts/init-db.sql` - PostgreSQL Initialization
- Extension setup (uuid-ossp, pg_trgm)
- Performance tuning for production
- Connection pooling configuration
- Logging setup
- Security best practices

### 4. Environment Configuration

#### `.env.example` - Development Template
- Comprehensive configuration guide
- SQLite setup for local development
- Mock Aigents integration
- All required environment variables documented

#### `.env.production.example` - Production Template
- PostgreSQL connection strings
- Security configurations
- GCP-specific settings
- Secret Manager integration guide
- Rate limiting and CORS
- Logging and monitoring
- Email/SMTP configuration
- Feature flags

### 5. Infrastructure as Code (Terraform)

#### `terraform/main.tf` - Complete GCP Infrastructure
Creates and manages:
- **Cloud Run service** (auto-scaling, SSL, health checks)
- **Cloud SQL PostgreSQL** (automated backups, SSL, private networking)
- **VPC Network** (private networking, VPC connector)
- **Secret Manager** (JWT secrets, database credentials)
- **Cloud Storage** (file uploads, lifecycle policies)
- **IAM & Service Accounts** (least-privilege permissions)
- **Monitoring** (query insights, performance monitoring)

Features:
- Environment-specific configurations (staging/production)
- Cost optimization options
- High availability for production
- Automated backups with point-in-time recovery
- Network security
- Proper resource labeling

#### `terraform/terraform.tfvars.example` - Configuration Template
- Staging configuration (cost-optimized)
- Production configuration (performance-optimized)
- Detailed comments for each setting

#### `terraform/README.md` - Infrastructure Guide
- Complete setup instructions
- Prerequisites and tool installation
- Step-by-step deployment
- Cost estimates
- Backup and restore procedures
- Troubleshooting guide

### 6. Deployment Scripts

#### `scripts/deploy-staging.sh` - Staging Deployment
- Automated staging deployment
- Docker build and push
- Database migrations
- Cloud Run deployment
- Health checks
- Service URL output

#### `scripts/deploy-production.sh` - Production Deployment
- Interactive confirmation required
- Full test suite execution
- Version tagging
- Gradual traffic rollout
- Health monitoring
- Git tagging
- Emergency rollback support

#### `scripts/rollback.sh` - Emergency Rollback
- Quick rollback to previous revision
- Support for both staging and production
- Confirmation prompts for production
- Health verification after rollback

#### `scripts/setup-gcp-secrets.sh` - Secret Management
- Interactive secret creation
- Auto-generation of JWT secrets
- Secret versioning
- Environment-specific configuration
- SMTP/email setup

#### `scripts/local-docker-test.sh` - Local Testing
- Test production Docker image locally
- Automated health checks
- Container management
- Log viewing
- Development validation

### 7. Comprehensive Documentation

#### `docs/DEPLOYMENT_GUIDE.md` - Production Deployment Guide
**130+ pages of detailed instructions:**
- Architecture overview
- Prerequisites and tool installation
- Initial GCP setup
- GitHub Actions configuration
- Terraform infrastructure deployment
- Database migration procedures
- Step-by-step deployment process
- Post-deployment verification
- Monitoring and maintenance
- Emergency procedures
- Complete troubleshooting guide

#### `docs/DEVELOPMENT_WORKFLOW.md` - Development After Deployment
**Covers:**
- Development environment setup
- Branching strategy (feature/bugfix/hotfix)
- Local development workflow
- Testing strategies (unit, integration, E2E)
- Database change management
- Code review process
- Git commit conventions
- Security best practices
- Common development tasks
- Troubleshooting development issues

#### `docs/COST_OPTIMIZATION.md` - Cost Management
**Includes:**
- Detailed cost breakdown by service
- Environment-specific cost estimates
  - Staging: ~$21/month
  - Production (moderate): ~$126/month
  - Production (high): ~$279/month
- Optimization strategies for each service
- Monitoring and alerting setup
- Cost reduction checklist
- Platform comparisons
- Real-world cost examples
- Committed use discounts

---

## Quick Start Deployment

### Prerequisites Checklist

- [ ] Google Cloud account with billing enabled
- [ ] GitHub repository with Actions enabled
- [ ] Domain name (optional, for custom domain)
- [ ] 30-60 minutes for initial setup

### Step 1: Clone and Setup

```bash
git clone https://github.com/your-org/irb-management-system.git
cd irb-management-system
```

### Step 2: Configure GitHub Secrets

Go to: `Settings > Secrets and variables > Actions`

Required secrets:
```
GCP_PROJECT_ID_STAGING
GCP_PROJECT_ID_PRODUCTION
GCP_SA_KEY_STAGING
GCP_SA_KEY_PRODUCTION
DATABASE_URL_STAGING
DATABASE_URL_PRODUCTION
JWT_SECRET_STAGING
JWT_SECRET_PRODUCTION
AIGENTS_WEBHOOK_SECRET_STAGING
AIGENTS_WEBHOOK_SECRET_PRODUCTION
AIGENTS_API_URL
AIGENTS_EMAIL
AIGENTS_FOLDER_ID
```

### Step 3: Deploy Infrastructure

```bash
cd terraform

# Configure for staging
cp terraform.tfvars.example terraform.staging.tfvars
# Edit terraform.staging.tfvars with your GCP project ID

# Initialize and deploy
terraform init
terraform apply -var-file="terraform.staging.tfvars"
```

Wait 10-15 minutes for Cloud SQL to be created.

### Step 4: Setup Secrets in GCP

```bash
chmod +x scripts/setup-gcp-secrets.sh
./scripts/setup-gcp-secrets.sh staging
```

### Step 5: Deploy Application

**Option A: Automatic (Recommended)**
```bash
# Push to develop branch
git checkout develop
git push origin develop

# GitHub Actions automatically deploys to staging
```

**Option B: Manual**
```bash
chmod +x scripts/deploy-staging.sh
./scripts/deploy-staging.sh
```

### Step 6: Verify Deployment

```bash
# Get service URL
gcloud run services describe irb-system-staging \
  --region us-central1 \
  --format 'value(status.url)'

# Test health endpoint
curl https://YOUR-SERVICE-URL/api/health
```

### Step 7: Deploy to Production

1. Test thoroughly in staging
2. Merge to main branch
3. Go to GitHub Actions
4. Run "Deploy to Production" workflow
5. Type: `deploy-to-production`
6. Monitor deployment progress

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         GitHub Repository                        │
│                    (Source Code + CI/CD)                         │
└────────────────┬───────────────────────────────────────────────┘
                 │
                 │ Push to develop → Auto Deploy Staging
                 │ Manual Workflow → Deploy Production
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                      GitHub Actions CI/CD                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │   Lint   │  │  Tests   │  │  Build   │  │  Deploy  │       │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
└────────────────┬───────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Google Cloud Platform                        │
│                                                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                      Cloud Run                             │  │
│  │  - Next.js Application (Auto-scaling)                     │  │
│  │  - 0-100 instances based on traffic                       │  │
│  │  - Health checks every 30 seconds                         │  │
│  │  - Zero-downtime deployments                              │  │
│  └────────────┬─────────────────────────────────────────────┘  │
│               │                                                   │
│               ▼                                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │              Cloud SQL (PostgreSQL 16)                     │  │
│  │  - Automated daily backups                                │  │
│  │  - Point-in-time recovery                                 │  │
│  │  - SSL connections                                        │  │
│  │  - High availability (production)                         │  │
│  └────────────┬─────────────────────────────────────────────┘  │
│               │                                                   │
│  ┌────────────┴─────────────┬──────────────────────────────┐  │
│  │                           │                               │  │
│  ▼                           ▼                               ▼  │
│ ┌─────────────┐   ┌──────────────────┐         ┌──────────┐  │
│ │   Cloud     │   │  Secret Manager  │         │   VPC    │  │
│ │  Storage    │   │  - JWT secrets   │         │ Network  │  │
│ │  (Uploads)  │   │  - DB passwords  │         │          │  │
│ └─────────────┘   └──────────────────┘         └──────────┘  │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Key Features of This Deployment

### Security
- ✅ Non-root Docker containers
- ✅ Secret Manager for sensitive data
- ✅ SSL/TLS encryption everywhere
- ✅ Security headers in Next.js
- ✅ Rate limiting support
- ✅ Database connection encryption
- ✅ IAM least-privilege permissions
- ✅ Automated security scanning (Trivy)

### Reliability
- ✅ Automated health checks
- ✅ Gradual traffic rollout
- ✅ Automatic rollback on failure
- ✅ Database backups (automated)
- ✅ Point-in-time recovery
- ✅ High availability option
- ✅ Container restart policies
- ✅ Load balancing

### Performance
- ✅ Auto-scaling (0 to 100+ instances)
- ✅ Database connection pooling
- ✅ Optimized Docker images
- ✅ Next.js production build
- ✅ SWC minification
- ✅ Response compression
- ✅ Database indexes
- ✅ Cloud CDN ready

### Developer Experience
- ✅ One-command deployments
- ✅ Automated testing in CI
- ✅ Local development with Docker
- ✅ Database migration automation
- ✅ Comprehensive documentation
- ✅ Helpful deployment scripts
- ✅ Clear error messages
- ✅ Detailed logging

### Cost Efficiency
- ✅ Pay only for what you use
- ✅ Auto-scaling to zero
- ✅ Cost optimization guide
- ✅ Budget alerts
- ✅ Resource right-sizing
- ✅ Free tier utilization
- ✅ ~$21/month staging
- ✅ ~$126/month production (moderate traffic)

---

## Next Steps

1. **Read the Documentation**
   - Start with `docs/DEPLOYMENT_GUIDE.md`
   - Review `docs/DEVELOPMENT_WORKFLOW.md`
   - Check `docs/COST_OPTIMIZATION.md`

2. **Set Up Your GCP Project**
   - Create staging and production projects
   - Enable billing
   - Install required tools

3. **Configure GitHub**
   - Add all required secrets
   - Test CI pipeline

4. **Deploy Infrastructure**
   - Use Terraform to create resources
   - Set up GCP secrets
   - Verify everything is created

5. **Deploy Application**
   - Use GitHub Actions or manual scripts
   - Test thoroughly in staging
   - Deploy to production

6. **Monitor and Maintain**
   - Set up monitoring dashboards
   - Configure alerts
   - Review costs weekly

---

## Support and Resources

### Documentation in This Repository
- `/docs/DEPLOYMENT_GUIDE.md` - Complete deployment instructions
- `/docs/DEVELOPMENT_WORKFLOW.md` - Development after deployment
- `/docs/COST_OPTIMIZATION.md` - Cost management strategies
- `/terraform/README.md` - Infrastructure guide
- `.env.example` - Environment configuration
- `.env.production.example` - Production configuration

### External Resources
- [Google Cloud Documentation](https://cloud.google.com/docs)
- [Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Cloud SQL Documentation](https://cloud.google.com/sql/docs)
- [Terraform GCP Provider](https://registry.terraform.io/providers/hashicorp/google/latest/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)

### Getting Help
- Review troubleshooting sections in documentation
- Check GitHub Actions logs for deployment issues
- Use GCP Cloud Console for infrastructure monitoring
- Consult GCP support for platform-specific issues

---

## Success Metrics

After successful deployment, you should have:

- ✅ **Staging environment** running and accessible
- ✅ **Production environment** ready for deployment
- ✅ **Automated CI/CD** pipeline running on every push
- ✅ **Database** migrated and accessible
- ✅ **Monitoring** and logging configured
- ✅ **Backups** scheduled and automated
- ✅ **Health checks** passing
- ✅ **SSL/TLS** configured
- ✅ **Cost alerts** set up
- ✅ **Documentation** available for team

---

## Maintenance Schedule

### Daily
- Monitor application logs
- Check error rates
- Review performance metrics

### Weekly
- Review cost reports
- Check backup success
- Review security alerts

### Monthly
- Database performance review
- Cost optimization review
- Dependency updates
- Security patches

### Quarterly
- Capacity planning
- Architecture review
- Disaster recovery testing
- Documentation updates

---

## Congratulations!

Your IRB Management System is now ready for enterprise-grade production deployment on Google Cloud Platform. This deployment package includes everything you need for a successful, scalable, and cost-effective deployment.

All components follow industry best practices for:
- Security and compliance
- Performance and reliability
- Cost optimization
- Developer experience
- Operational excellence

The automated CI/CD pipeline ensures that every deployment is tested, validated, and safely rolled out with automatic rollback capabilities.

**You are now ready to deploy to production!** 🚀
