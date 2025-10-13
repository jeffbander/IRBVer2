# Terraform Infrastructure for IRB Management System

This directory contains Terraform configurations for deploying the IRB Management System infrastructure on Google Cloud Platform.

## Architecture

The infrastructure includes:

- **Cloud Run**: Serverless container platform for the Next.js application
- **Cloud SQL**: Managed PostgreSQL database
- **VPC Network**: Private networking for database security
- **Secret Manager**: Secure storage for sensitive configuration
- **Cloud Storage**: File upload storage
- **IAM**: Service accounts and permissions

## Cost Estimates

### Staging Environment (Minimal Usage)
- Cloud SQL (db-f1-micro): ~$7/month
- Cloud Run (minimal traffic): ~$5/month
- Cloud Storage: ~$1/month
- **Total**: ~$13/month

### Production Environment (Moderate Usage)
- Cloud SQL (db-n1-standard-1): ~$50/month
- Cloud Run (10K requests/day): ~$30/month
- Cloud Storage: ~$5/month
- VPC Access Connector: ~$8/month
- **Total**: ~$93/month

## Prerequisites

1. **Install Terraform**
   ```bash
   # macOS
   brew install terraform

   # Windows
   choco install terraform

   # Or download from https://www.terraform.io/downloads
   ```

2. **Install Google Cloud SDK**
   ```bash
   # macOS
   brew install google-cloud-sdk

   # Windows
   # Download from https://cloud.google.com/sdk/docs/install
   ```

3. **Authenticate with GCP**
   ```bash
   gcloud auth login
   gcloud auth application-default login
   ```

4. **Create GCP Project**
   ```bash
   gcloud projects create YOUR_PROJECT_ID
   gcloud config set project YOUR_PROJECT_ID

   # Enable billing (required)
   # Go to: https://console.cloud.google.com/billing
   ```

## Setup

### 1. Configure Variables

Copy the example variables file:
```bash
cp terraform.tfvars.example terraform.staging.tfvars
```

Edit `terraform.staging.tfvars` with your values:
```hcl
project_id  = "your-gcp-project-id"
region      = "us-central1"
environment = "staging"
```

### 2. Initialize Terraform

```bash
cd terraform
terraform init
```

### 3. Plan Infrastructure

Review the planned changes:
```bash
terraform plan -var-file="terraform.staging.tfvars"
```

### 4. Apply Configuration

Create the infrastructure:
```bash
terraform apply -var-file="terraform.staging.tfvars"
```

Type `yes` when prompted.

This will create:
- Cloud SQL instance (takes ~10 minutes)
- Cloud Run service
- VPC network
- Secrets
- Storage bucket

### 5. Get Outputs

After deployment, retrieve important values:
```bash
terraform output
```

Save these outputs:
- `cloud_run_url`: Your application URL
- `database_connection_name`: For connecting to Cloud SQL
- `storage_bucket`: For file uploads

## Deployment Workflow

### Initial Deployment

1. **Apply Terraform**
   ```bash
   terraform apply -var-file="terraform.staging.tfvars"
   ```

2. **Build and Push Docker Image**
   ```bash
   # From project root
   gcloud builds submit --config cloudbuild.yaml
   ```

3. **Deploy to Cloud Run**
   ```bash
   # Automatically handled by GitHub Actions
   # Or manually:
   gcloud run deploy irb-system-staging \
     --image gcr.io/YOUR_PROJECT_ID/irb-system-staging:latest \
     --platform managed \
     --region us-central1
   ```

4. **Run Database Migrations**
   ```bash
   # Set environment variables
   export DATABASE_URL=$(terraform output -raw database_connection_name)

   # Run migrations
   npm ci
   npx prisma generate
   npx prisma migrate deploy
   ```

### Updates

When updating infrastructure:

1. **Plan Changes**
   ```bash
   terraform plan -var-file="terraform.staging.tfvars"
   ```

2. **Review Changes**
   - Check what resources will be modified
   - Ensure no data loss

3. **Apply Changes**
   ```bash
   terraform apply -var-file="terraform.staging.tfvars"
   ```

## Environment-Specific Configurations

### Staging

```hcl
# terraform.staging.tfvars
environment             = "staging"
db_instance_tier        = "db-f1-micro"
cloud_run_min_instances = 0
cloud_run_max_instances = 10
cloud_run_memory        = "512Mi"
cloud_run_cpu           = "1"
```

### Production

```hcl
# terraform.production.tfvars
environment             = "production"
db_instance_tier        = "db-n1-standard-1"
cloud_run_min_instances = 1
cloud_run_max_instances = 100
cloud_run_memory        = "1Gi"
cloud_run_cpu           = "2"
db_backup_enabled       = true
```

## Secrets Management

Terraform creates secrets in Secret Manager:
- `DATABASE_URL_STAGING` or `DATABASE_URL_PRODUCTION`
- `JWT_SECRET_STAGING` or `JWT_SECRET_PRODUCTION`

Add additional secrets manually:
```bash
# Aigents webhook secret
echo -n "your-webhook-secret" | gcloud secrets create AIGENTS_WEBHOOK_SECRET_STAGING \
  --data-file=- \
  --replication-policy="automatic"

# Aigents folder ID
echo -n "your-folder-id" | gcloud secrets create AIGENTS_FOLDER_ID \
  --data-file=- \
  --replication-policy="automatic"
```

## Database Access

### Cloud SQL Proxy (Local Development)

```bash
# Download Cloud SQL Proxy
curl -o cloud_sql_proxy https://dl.google.com/cloudsql/cloud_sql_proxy.darwin.amd64
chmod +x cloud_sql_proxy

# Start proxy
./cloud_sql_proxy -instances=PROJECT:REGION:INSTANCE=tcp:5432
```

### Connect to Database

```bash
# Get connection details
terraform output database_connection_name
terraform output database_user

# Connect via psql
psql "host=/cloudsql/PROJECT:REGION:INSTANCE dbname=irb_staging user=irbuser"
```

## Monitoring

Access monitoring dashboards:

1. **Cloud Run**
   ```
   https://console.cloud.google.com/run
   ```

2. **Cloud SQL**
   ```
   https://console.cloud.google.com/sql
   ```

3. **Logs**
   ```
   https://console.cloud.google.com/logs
   ```

## Backup and Restore

### Automated Backups

Backups are configured automatically:
- Daily backups at 3:00 AM UTC
- 7-day retention
- Point-in-time recovery (production only)

### Manual Backup

```bash
gcloud sql backups create \
  --instance=irb-system-staging-db \
  --description="Manual backup before migration"
```

### Restore from Backup

```bash
# List backups
gcloud sql backups list --instance=irb-system-staging-db

# Restore
gcloud sql backups restore BACKUP_ID \
  --backup-instance=irb-system-staging-db \
  --backup-id=BACKUP_ID
```

## Disaster Recovery

### Database Export

```bash
# Export to Cloud Storage
gcloud sql export sql irb-system-staging-db \
  gs://YOUR_BUCKET/backups/db-export-$(date +%Y%m%d).sql \
  --database=irb_staging
```

### Database Import

```bash
# Import from Cloud Storage
gcloud sql import sql irb-system-staging-db \
  gs://YOUR_BUCKET/backups/db-export-20231201.sql \
  --database=irb_staging
```

## Cleanup

To destroy all resources:

```bash
# Review what will be destroyed
terraform plan -destroy -var-file="terraform.staging.tfvars"

# Destroy infrastructure
terraform destroy -var-file="terraform.staging.tfvars"
```

**Warning**: This will delete all data including databases!

## Troubleshooting

### Issue: Terraform timeout creating Cloud SQL

**Solution**: Cloud SQL creation takes 10-15 minutes. Wait and retry.

### Issue: Permission denied errors

**Solution**: Ensure you have required IAM roles:
```bash
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="user:YOUR_EMAIL" \
  --role="roles/owner"
```

### Issue: API not enabled

**Solution**: Enable required APIs:
```bash
gcloud services enable run.googleapis.com
gcloud services enable sqladmin.googleapis.com
gcloud services enable secretmanager.googleapis.com
```

## Security Best Practices

1. **Use Secret Manager** for all sensitive values
2. **Enable Cloud SQL SSL** (configured by default)
3. **Use private IP** for Cloud SQL (optional, uncomment in main.tf)
4. **Restrict IAM permissions** to least privilege
5. **Enable Cloud Armor** for DDoS protection (production)
6. **Enable VPC Service Controls** for additional security

## Additional Resources

- [Terraform GCP Provider](https://registry.terraform.io/providers/hashicorp/google/latest/docs)
- [Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Cloud SQL Documentation](https://cloud.google.com/sql/docs)
- [GCP Pricing Calculator](https://cloud.google.com/products/calculator)
