#!/bin/bash

# ===============================================================================
# Deploy to Staging Environment
# ===============================================================================
# This script deploys the IRB Management System to the staging environment
#
# Usage:
#   ./scripts/deploy-staging.sh
#
# Prerequisites:
#   - gcloud CLI installed and configured
#   - Docker installed
#   - Terraform applied (infrastructure created)
# ===============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT="staging"
PROJECT_ID=${GCP_PROJECT_ID_STAGING}
REGION="us-central1"
SERVICE_NAME="irb-system-staging"
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}IRB System - Staging Deployment${NC}"
echo -e "${GREEN}========================================${NC}"
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
    echo -e "${RED}Error: GCP_PROJECT_ID_STAGING not set${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Prerequisites OK${NC}"
echo ""

# Set GCP project
echo -e "${YELLOW}Setting GCP project...${NC}"
gcloud config set project $PROJECT_ID
echo -e "${GREEN}✓ Project set${NC}"
echo ""

# Build Docker image
echo -e "${YELLOW}Building Docker image...${NC}"
docker build -t ${IMAGE_NAME}:latest -f Dockerfile.production .
echo -e "${GREEN}✓ Image built${NC}"
echo ""

# Tag with git commit
GIT_SHA=$(git rev-parse --short HEAD)
docker tag ${IMAGE_NAME}:latest ${IMAGE_NAME}:${GIT_SHA}
echo -e "${GREEN}✓ Tagged with git SHA: ${GIT_SHA}${NC}"
echo ""

# Push to Google Container Registry
echo -e "${YELLOW}Pushing image to GCR...${NC}"
gcloud auth configure-docker
docker push ${IMAGE_NAME}:latest
docker push ${IMAGE_NAME}:${GIT_SHA}
echo -e "${GREEN}✓ Image pushed${NC}"
echo ""

# Run database migrations
echo -e "${YELLOW}Running database migrations...${NC}"
# Note: DATABASE_URL should be set in environment or use Secret Manager
if [ -n "$DATABASE_URL_STAGING" ]; then
    export DATABASE_URL=$DATABASE_URL_STAGING
    npm ci --silent
    npx prisma generate
    npx prisma migrate deploy
    echo -e "${GREEN}✓ Migrations completed${NC}"
else
    echo -e "${YELLOW}⚠ DATABASE_URL_STAGING not set, skipping migrations${NC}"
fi
echo ""

# Deploy to Cloud Run
echo -e "${YELLOW}Deploying to Cloud Run...${NC}"
gcloud run deploy ${SERVICE_NAME} \
    --image ${IMAGE_NAME}:${GIT_SHA} \
    --platform managed \
    --region ${REGION} \
    --allow-unauthenticated \
    --min-instances 0 \
    --max-instances 10 \
    --memory 512Mi \
    --cpu 1 \
    --timeout 300 \
    --set-env-vars "NODE_ENV=staging" \
    --set-secrets "DATABASE_URL=DATABASE_URL_STAGING:latest,JWT_SECRET=JWT_SECRET_STAGING:latest,AIGENTS_WEBHOOK_SECRET=AIGENTS_WEBHOOK_SECRET_STAGING:latest,AIGENTS_FOLDER_ID=AIGENTS_FOLDER_ID:latest,AIGENTS_API_URL=AIGENTS_API_URL:latest,AIGENTS_EMAIL=AIGENTS_EMAIL:latest" \
    --revision-suffix ${GIT_SHA}

echo -e "${GREEN}✓ Deployed to Cloud Run${NC}"
echo ""

# Get service URL
SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME} --platform managed --region ${REGION} --format 'value(status.url)')
echo -e "${GREEN}Service URL: ${SERVICE_URL}${NC}"
echo ""

# Run health check
echo -e "${YELLOW}Running health check...${NC}"
sleep 10
HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" ${SERVICE_URL}/api/health)

if [ "$HEALTH_STATUS" = "200" ]; then
    echo -e "${GREEN}✓ Health check passed${NC}"
else
    echo -e "${RED}✗ Health check failed (HTTP ${HEALTH_STATUS})${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Deployment Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "Environment: ${ENVIRONMENT}"
echo -e "URL: ${SERVICE_URL}"
echo -e "Image: ${IMAGE_NAME}:${GIT_SHA}"
echo ""
