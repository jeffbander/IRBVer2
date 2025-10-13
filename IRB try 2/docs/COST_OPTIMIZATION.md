# Cost Optimization Guide for IRB Management System

This guide provides detailed cost estimates and optimization strategies for running the IRB Management System on Google Cloud Platform.

## Table of Contents

1. [Cost Breakdown](#cost-breakdown)
2. [Cost Estimates by Environment](#cost-estimates-by-environment)
3. [Optimization Strategies](#optimization-strategies)
4. [Monitoring Costs](#monitoring-costs)
5. [Cost Reduction Checklist](#cost-reduction-checklist)

---

## Cost Breakdown

### Components and Pricing

| Service | Pricing Model | Free Tier | Notes |
|---------|--------------|-----------|-------|
| Cloud Run | Per request + CPU time | 2M requests/month, 360K vCPU-seconds/month | Charges for CPU, memory, and requests |
| Cloud SQL | Per hour + storage | None | Charges for instance uptime, storage, backups |
| Cloud Storage | Per GB/month + operations | 5GB/month | Charges for storage and data transfer |
| Secret Manager | Per secret version + access | 6 secrets free | Very low cost (~$0.06/secret/month) |
| VPC Connector | Per hour | None | ~$0.011/hour = ~$8/month |
| Cloud Build | Per build minute | 120 build-minutes/day | Used in CI/CD |
| Container Registry | Storage + egress | None | Minimal for image storage |

---

## Cost Estimates by Environment

### Staging Environment (Minimal Usage)

**Assumptions:**
- 10,000 requests/month (~333 requests/day)
- Cloud Run: 2 vCPUs for 100ms per request
- Cloud SQL: db-f1-micro, running 24/7
- 5 GB storage
- Minimal egress

**Monthly Costs:**

```
Cloud Run:
  - Requests: 10,000 * $0.40/million = $0.00
  - vCPU-time: (10,000 * 0.1s * 2 vCPU) = 2,000 vCPU-seconds
    Under free tier (360,000 vCPU-seconds/month)
  - Memory: Under free tier
  Total: $0.00 (within free tier)

Cloud SQL (db-f1-micro):
  - Instance: $0.0150/hour * 730 hours = $10.95
  - Storage: 10 GB * $0.09/GB = $0.90
  - Backups: 10 GB * $0.08/GB = $0.80
  Total: $12.65

Cloud Storage:
  - Storage: 5 GB (within free tier)
  - Operations: Negligible
  Total: $0.00

VPC Connector:
  - $0.011/hour * 730 hours = $8.03
  Total: $8.03

Networking:
  - Egress: ~1 GB * $0.12/GB = $0.12
  Total: $0.12

Secret Manager:
  - 10 secrets * $0.06 = $0.60
  Total: $0.60

STAGING TOTAL: ~$21.40/month
```

### Production Environment (Moderate Usage)

**Assumptions:**
- 300,000 requests/month (~10,000 requests/day)
- Cloud Run: Average 300ms response time, 1-3 instances
- Cloud SQL: db-n1-standard-1, running 24/7
- 50 GB storage
- 50 GB egress/month

**Monthly Costs:**

```
Cloud Run:
  - Requests: 300,000 * $0.40/million = $0.12
  - vCPU-time: (300,000 * 0.3s * 2 vCPU) = 180,000 vCPU-seconds
    Under free tier
  - Memory: (300,000 * 0.3s * 1 GiB) = 90,000 GiB-seconds
    $0.0000025/GiB-second = $0.23
  Total: $0.35

Cloud SQL (db-n1-standard-1):
  - Instance: $0.1380/hour * 730 hours = $100.74
  - Storage: 50 GB * $0.09/GB = $4.50
  - Backups: 50 GB * $0.08/GB = $4.00
  Total: $109.24

Cloud Storage:
  - Storage: 50 GB * $0.02/GB = $1.00
  - Operations: ~10,000 Class A * $0.005/10,000 = $0.05
  Total: $1.05

VPC Connector:
  - $0.011/hour * 730 hours = $8.03
  Total: $8.03

Networking:
  - Egress: 50 GB * $0.12/GB = $6.00
  Total: $6.00

Secret Manager:
  - 15 secrets * $0.06 = $0.90
  Total: $0.90

PRODUCTION TOTAL: ~$125.57/month
```

### Production Environment (High Usage)

**Assumptions:**
- 1,000,000 requests/month (~33,000 requests/day)
- Cloud Run: 5-10 instances during peak
- Cloud SQL: db-n1-standard-2 with read replicas
- 200 GB storage
- 200 GB egress/month

**Monthly Costs:**

```
Cloud Run:
  - Requests: 1,000,000 * $0.40/million = $0.40
  - vCPU-time: (1,000,000 * 0.3s * 2 vCPU) = 600,000 vCPU-seconds
    Over free tier: (600,000 - 360,000) * $0.00002400 = $5.76
  - Memory: (1,000,000 * 0.3s * 1 GiB) = 300,000 GiB-seconds
    Over free tier: (300,000 - 200,000) * $0.0000025 = $0.25
  Total: $6.41

Cloud SQL (db-n1-standard-2):
  - Primary: $0.2760/hour * 730 hours = $201.48
  - Storage: 200 GB * $0.09/GB = $18.00
  - Backups: 200 GB * $0.08/GB = $16.00
  Total: $235.48

Cloud Storage:
  - Storage: 200 GB * $0.02/GB = $4.00
  - Operations: ~50,000 Class A * $0.005/10,000 = $0.25
  Total: $4.25

VPC Connector:
  - $0.011/hour * 730 hours = $8.03
  Total: $8.03

Networking:
  - Egress: 200 GB * $0.12/GB = $24.00
  Total: $24.00

Secret Manager:
  - 15 secrets * $0.06 = $0.90
  Total: $0.90

HIGH USAGE TOTAL: ~$279.07/month
```

---

## Optimization Strategies

### 1. Cloud Run Optimization

#### Reduce Cold Starts
```yaml
# Increase minimum instances (costs more but improves performance)
--min-instances 1  # Default: 0

# Cost: ~$8/month per instance kept warm
# Benefit: Eliminates cold start latency
```

#### Optimize Memory Allocation
```yaml
# Use minimum memory required
--memory 512Mi  # Instead of 1Gi if possible

# Monitor actual usage:
gcloud monitoring read "compute.googleapis.com/instance/memory/used_bytes" \
  --filter="resource.type=cloud_run_revision"
```

#### Optimize CPU Allocation
```yaml
# Use CPU throttling when possible
--cpu-throttling  # Default for Cloud Run

# Only use always-on CPU if needed:
--no-cpu-throttling  # Costs more
```

#### Request Concurrency
```yaml
# Increase concurrent requests per instance
--concurrency 80  # Default: 80, max: 1000

# Higher concurrency = fewer instances = lower cost
# But: May increase response time under load
```

### 2. Cloud SQL Optimization

#### Right-Size Your Instance

```bash
# Start small and scale up
# Staging: db-f1-micro ($11/month)
# Production (low traffic): db-g1-small ($25/month)
# Production (medium traffic): db-n1-standard-1 ($100/month)
# Production (high traffic): db-n1-standard-2 ($200/month)

# Monitor CPU and memory usage
gcloud sql instances describe INSTANCE_NAME
```

#### Enable Auto-scaling Storage
```hcl
# In Terraform
disk_autoresize = true

# Prevents over-provisioning
```

#### Optimize Backups
```hcl
# Reduce backup retention for staging
backup_configuration {
  enabled = true
  start_time = "03:00"
  transaction_log_retention_days = 3  # Instead of 7
  backup_retention_settings {
    retained_backups = 3  # Instead of 7
  }
}
```

#### Use Maintenance Windows
```bash
# Schedule maintenance during low-traffic periods
gcloud sql instances patch INSTANCE_NAME \
  --maintenance-window-day=SUN \
  --maintenance-window-hour=3
```

#### Connection Pooling
```typescript
// Use connection pooling to reduce connections
// Fewer connections = smaller instance possible

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL + '?connection_limit=5'
    }
  }
});
```

### 3. Cloud Storage Optimization

#### Lifecycle Policies
```hcl
lifecycle_rule {
  condition {
    age = 90  # Days
  }
  action {
    type = "Delete"
  }
}

lifecycle_rule {
  condition {
    age = 30
  }
  action {
    type          = "SetStorageClass"
    storage_class = "NEARLINE"  # Cheaper for infrequent access
  }
}
```

#### Optimize File Uploads
```typescript
// Compress images before upload
// Use lower-cost storage classes for archives
// Delete temporary files
```

### 4. Network Optimization

#### Reduce Egress
```typescript
// Enable compression
// Use CDN for static assets (Cloud CDN)
// Cache responses when possible
```

#### Optimize VPC Connector
```yaml
# Only use VPC connector if needed
# Consider using public IP for Cloud SQL in non-prod
# Disable VPC connector for staging

# In Cloud Run deployment:
# Remove: --vpc-connector
```

### 5. Development Environment

#### Stop Resources When Not in Use
```bash
# Stop Cloud SQL when not needed (staging/dev)
gcloud sql instances patch INSTANCE_NAME --activation-policy=NEVER

# Restart when needed
gcloud sql instances patch INSTANCE_NAME --activation-policy=ALWAYS
```

#### Use Committed Use Discounts
```bash
# For production, commit to 1 or 3 years
# Save up to 57% on Cloud SQL
# Save up to 37% on Cloud Run (if using min instances)

# Purchase through GCP Console:
# https://console.cloud.google.com/billing/commitments
```

---

## Monitoring Costs

### 1. Set Up Budget Alerts

```bash
# Create budget alert
gcloud billing budgets create \
  --billing-account=BILLING_ACCOUNT \
  --display-name="IRB System Monthly Budget" \
  --budget-amount=150USD \
  --threshold-rule=percent=50 \
  --threshold-rule=percent=75 \
  --threshold-rule=percent=90 \
  --threshold-rule=percent=100
```

### 2. Cost Analysis Dashboard

1. Go to: https://console.cloud.google.com/billing/reports
2. Group by: Service, SKU
3. Filter by: Project, Date range
4. Export: CSV for detailed analysis

### 3. Daily Cost Monitoring

```bash
# View daily costs
gcloud billing accounts describe BILLING_ACCOUNT

# View project costs
gcloud billing projects describe PROJECT_ID
```

### 4. Set Up Cost Alerts

Create alerting policies:
```yaml
# Alert when costs exceed threshold
# Email/SMS notifications
# Slack/Discord webhooks
```

---

## Cost Reduction Checklist

### Immediate Actions

- [ ] Right-size Cloud SQL instances
- [ ] Set minimum Cloud Run instances to 0 for staging
- [ ] Enable Cloud SQL automatic storage increase
- [ ] Set up budget alerts
- [ ] Delete unused resources
- [ ] Reduce backup retention for non-prod
- [ ] Review and optimize egress traffic

### Short-term Actions (1-2 weeks)

- [ ] Implement connection pooling
- [ ] Add Cloud Storage lifecycle policies
- [ ] Optimize database queries
- [ ] Enable Cloud Run concurrency
- [ ] Set up monitoring dashboards
- [ ] Review and optimize Docker image size

### Long-term Actions (1-3 months)

- [ ] Consider committed use discounts
- [ ] Implement caching strategy (Redis)
- [ ] Optimize API response sizes
- [ ] Add CDN for static assets
- [ ] Review and optimize database schema
- [ ] Implement lazy loading

### Continuous Optimization

- [ ] Monthly cost review
- [ ] Quarterly capacity planning
- [ ] Performance monitoring
- [ ] Resource utilization analysis
- [ ] Update cost estimates based on usage

---

## Cost Comparison: GCP vs Other Platforms

### Alternative Hosting Options

| Platform | Est. Monthly Cost | Pros | Cons |
|----------|------------------|------|------|
| **GCP Cloud Run** | $125 | Auto-scaling, serverless, PostgreSQL | Learning curve, potential cold starts |
| **AWS (ECS + RDS)** | $150 | Mature platform, many integrations | More complex, higher baseline |
| **Vercel + Supabase** | $40 | Easy setup, good DX | Limited scaling, vendor lock-in |
| **DigitalOcean** | $60 | Simple, predictable pricing | Manual scaling, less automation |
| **Railway** | $50 | Simple deployment | Limited enterprise features |
| **Fly.io** | $45 | Good performance | Smaller ecosystem |

### Why GCP Cloud Run?

**Pros:**
- Automatic scaling from 0 to many instances
- Pay only for what you use
- Enterprise-grade reliability
- Integrated monitoring and logging
- Strong security features
- PostgreSQL with automated backups
- Kubernetes under the hood (no management needed)

**Cons:**
- Slightly higher cost than some alternatives
- Cold starts (mitigated with min instances)
- GCP-specific knowledge required

---

## Real-World Cost Examples

### Startup (100 users, 5K requests/day)
```
Staging:  $21/month
Production: $80/month
Total: $101/month
```

### Small Organization (500 users, 25K requests/day)
```
Staging: $21/month
Production: $140/month
Total: $161/month
```

### Medium Organization (2000 users, 100K requests/day)
```
Staging: $25/month
Production: $280/month
Total: $305/month
```

### Large Organization (10000 users, 500K requests/day)
```
Staging: $30/month
Production: $650/month (with dedicated instance, read replicas)
Total: $680/month
```

---

## Getting Started with Optimization

1. **Baseline your current costs**
   ```bash
   # Check current monthly costs
   gcloud billing accounts describe BILLING_ACCOUNT
   ```

2. **Set up monitoring**
   - Enable budget alerts
   - Create cost dashboard
   - Track key metrics

3. **Apply quick wins**
   - Right-size instances
   - Remove unused resources
   - Optimize backups

4. **Measure and iterate**
   - Review monthly
   - Adjust based on actual usage
   - Document changes

---

## Support Resources

- **GCP Pricing Calculator**: https://cloud.google.com/products/calculator
- **Cloud Run Pricing**: https://cloud.google.com/run/pricing
- **Cloud SQL Pricing**: https://cloud.google.com/sql/pricing
- **Cost Optimization Best Practices**: https://cloud.google.com/cost-management/docs/best-practices
