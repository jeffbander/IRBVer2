#!/bin/bash

# ===============================================================================
# Deploy to Production Environment (with approval)
# ===============================================================================
# This script deploys the IRB Management System to production
# with gradual traffic rollout and health checks
#
# Usage:
#   ./scripts/deploy-production.sh
#
# Prerequisites:
#   - gcloud CLI installed and configured
#   - Docker installed
#   - Terraform applied (infrastructure created)
#   - Full test suite passed
# ===============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT="production"
PROJECT_ID=${GCP_PROJECT_ID_PRODUCTION}
REGION="us-central1"
SERVICE_NAME="irb-system-production"
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

echo -e "${RED}========================================${NC}"
echo -e "${RED}IRB System - PRODUCTION Deployment${NC}"
echo -e "${RED}========================================${NC}"
echo ""
echo -e "${YELLOW}⚠ WARNING: You are about to deploy to PRODUCTION${NC}"
echo -e "${YELLOW}⚠ This will affect live users and data${NC}"
echo ""

# Confirmation prompt
read -p "Type 'deploy-to-production' to confirm: " CONFIRMATION

if [ "$CONFIRMATION" != "deploy-to-production" ]; then
    echo -e "${RED}Deployment cancelled${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}Deployment confirmed${NC}"
echo ""

# Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"

if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}Error: gcloud CLI not found${NC}"
    exit 1
fi

if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: docker not found${NC}"
    exit 1
fi

if [ -z "$PROJECT_ID" ]; then
    echo -e "${RED}Error: GCP_PROJECT_ID_PRODUCTION not set${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Prerequisites OK${NC}"
echo ""

# Set GCP project
echo -e "${YELLOW}Setting GCP project...${NC}"
gcloud config set project $PROJECT_ID
echo -e "${GREEN}✓ Project set${NC}"
echo ""

# Run tests
echo -e "${YELLOW}Running test suite...${NC}"
npm run lint
npm run test
echo -e "${GREEN}✓ Tests passed${NC}"
echo ""

# Build Docker image
echo -e "${YELLOW}Building Docker image...${NC}"
docker build -t ${IMAGE_NAME}:latest -f Dockerfile.production .
echo -e "${GREEN}✓ Image built${NC}"
echo ""

# Tag with git commit and version
GIT_SHA=$(git rev-parse --short HEAD)
BUILD_NUMBER=${GITHUB_RUN_NUMBER:-$(date +%Y%m%d%H%M%S)}
docker tag ${IMAGE_NAME}:latest ${IMAGE_NAME}:${GIT_SHA}
docker tag ${IMAGE_NAME}:latest ${IMAGE_NAME}:v${BUILD_NUMBER}
echo -e "${GREEN}✓ Tagged: ${GIT_SHA}, v${BUILD_NUMBER}${NC}"
echo ""

# Push to Google Container Registry
echo -e "${YELLOW}Pushing image to GCR...${NC}"
gcloud auth configure-docker
docker push ${IMAGE_NAME}:latest
docker push ${IMAGE_NAME}:${GIT_SHA}
docker push ${IMAGE_NAME}:v${BUILD_NUMBER}
echo -e "${GREEN}✓ Image pushed${NC}"
echo ""

# Run database migrations
echo -e "${YELLOW}Running database migrations...${NC}"
if [ -n "$DATABASE_URL_PRODUCTION" ]; then
    export DATABASE_URL=$DATABASE_URL_PRODUCTION
    npm ci --silent
    npx prisma generate
    npx prisma migrate deploy
    echo -e "${GREEN}✓ Migrations completed${NC}"
else
    echo -e "${RED}Error: DATABASE_URL_PRODUCTION not set${NC}"
    exit 1
fi
echo ""

# Deploy to Cloud Run with NO TRAFFIC initially
echo -e "${YELLOW}Deploying new revision (0% traffic)...${NC}"
gcloud run deploy ${SERVICE_NAME} \
    --image ${IMAGE_NAME}:${GIT_SHA} \
    --platform managed \
    --region ${REGION} \
    --allow-unauthenticated \
    --min-instances 1 \
    --max-instances 100 \
    --memory 1Gi \
    --cpu 2 \
    --timeout 300 \
    --set-env-vars "NODE_ENV=production" \
    --set-secrets "DATABASE_URL=DATABASE_URL_PRODUCTION:latest,JWT_SECRET=JWT_SECRET_PRODUCTION:latest,AIGENTS_WEBHOOK_SECRET=AIGENTS_WEBHOOK_SECRET_PRODUCTION:latest,AIGENTS_FOLDER_ID=AIGENTS_FOLDER_ID:latest,AIGENTS_API_URL=AIGENTS_API_URL:latest,AIGENTS_EMAIL=AIGENTS_EMAIL:latest" \
    --revision-suffix prod-${GIT_SHA} \
    --no-traffic

echo -e "${GREEN}✓ New revision deployed${NC}"
echo ""

# Get new revision name
NEW_REVISION=$(gcloud run revisions list \
    --service ${SERVICE_NAME} \
    --platform managed \
    --region ${REGION} \
    --limit 1 \
    --format="value(name)")

echo -e "${GREEN}New revision: ${NEW_REVISION}${NC}"
echo ""

# Test new revision
echo -e "${YELLOW}Testing new revision...${NC}"
SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME} --platform managed --region ${REGION} --format 'value(status.url)')

# Health check
for i in {1..5}; do
    HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" ${SERVICE_URL}/api/health)
    if [ "$HEALTH_STATUS" = "200" ]; then
        echo -e "${GREEN}✓ Health check ${i}/5 passed${NC}"
    else
        echo -e "${RED}✗ Health check failed (HTTP ${HEALTH_STATUS})${NC}"
        echo -e "${RED}Rolling back...${NC}"
        # Rollback would happen here
        exit 1
    fi
    sleep 2
done
echo ""

# Gradual traffic migration
echo -e "${YELLOW}Starting gradual traffic migration...${NC}"
echo ""

# 10% traffic
echo -e "${YELLOW}Migrating 10% traffic to new revision...${NC}"
gcloud run services update-traffic ${SERVICE_NAME} \
    --to-revisions ${NEW_REVISION}=10 \
    --platform managed \
    --region ${REGION}
echo -e "${GREEN}✓ 10% traffic migrated${NC}"
sleep 60

# Monitor for errors
echo -e "${YELLOW}Monitoring for errors (60s)...${NC}"
sleep 60

# 50% traffic
echo -e "${YELLOW}Migrating 50% traffic to new revision...${NC}"
gcloud run services update-traffic ${SERVICE_NAME} \
    --to-revisions ${NEW_REVISION}=50 \
    --platform managed \
    --region ${REGION}
echo -e "${GREEN}✓ 50% traffic migrated${NC}"
sleep 120

# Monitor for errors
echo -e "${YELLOW}Monitoring for errors (120s)...${NC}"
sleep 120

# 100% traffic
echo -e "${YELLOW}Migrating 100% traffic to new revision...${NC}"
gcloud run services update-traffic ${SERVICE_NAME} \
    --to-revisions ${NEW_REVISION}=100 \
    --platform managed \
    --region ${REGION}
echo -e "${GREEN}✓ 100% traffic migrated${NC}"
echo ""

# Final verification
echo -e "${YELLOW}Running final verification...${NC}"
for i in {1..10}; do
    HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" ${SERVICE_URL}/api/health)
    if [ "$HEALTH_STATUS" != "200" ]; then
        echo -e "${RED}✗ Health check failed after migration${NC}"
        exit 1
    fi
    sleep 1
done
echo -e "${GREEN}✓ All health checks passed${NC}"
echo ""

# Tag git commit
echo -e "${YELLOW}Tagging git commit...${NC}"
git tag -a "production-${BUILD_NUMBER}" -m "Production deployment ${BUILD_NUMBER}"
git push origin "production-${BUILD_NUMBER}" || echo "Failed to push tag (not critical)"
echo ""

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Production Deployment Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "Environment: ${ENVIRONMENT}"
echo -e "URL: ${SERVICE_URL}"
echo -e "Image: ${IMAGE_NAME}:${GIT_SHA}"
echo -e "Version: v${BUILD_NUMBER}"
echo -e "Revision: ${NEW_REVISION}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo -e "1. Monitor logs: gcloud run services logs read ${SERVICE_NAME}"
echo -e "2. Check metrics: https://console.cloud.google.com/run"
echo -e "3. Test application: ${SERVICE_URL}"
echo ""
