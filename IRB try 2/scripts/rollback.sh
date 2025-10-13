#!/bin/bash

# ===============================================================================
# Rollback Cloud Run Deployment
# ===============================================================================
# This script rolls back a Cloud Run service to the previous revision
#
# Usage:
#   ./scripts/rollback.sh [staging|production]
#
# Example:
#   ./scripts/rollback.sh staging
# ===============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check arguments
if [ $# -eq 0 ]; then
    echo -e "${RED}Error: Environment not specified${NC}"
    echo "Usage: $0 [staging|production]"
    exit 1
fi

ENVIRONMENT=$1

# Set configuration based on environment
if [ "$ENVIRONMENT" = "staging" ]; then
    PROJECT_ID=${GCP_PROJECT_ID_STAGING}
    SERVICE_NAME="irb-system-staging"
elif [ "$ENVIRONMENT" = "production" ]; then
    PROJECT_ID=${GCP_PROJECT_ID_PRODUCTION}
    SERVICE_NAME="irb-system-production"

    echo -e "${RED}⚠ WARNING: You are about to rollback PRODUCTION${NC}"
    read -p "Type 'rollback-production' to confirm: " CONFIRMATION

    if [ "$CONFIRMATION" != "rollback-production" ]; then
        echo -e "${RED}Rollback cancelled${NC}"
        exit 1
    fi
else
    echo -e "${RED}Error: Invalid environment. Use 'staging' or 'production'${NC}"
    exit 1
fi

REGION="us-central1"

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}Rolling back: ${ENVIRONMENT}${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""

# Set GCP project
gcloud config set project $PROJECT_ID

# Get current revision
CURRENT_REVISION=$(gcloud run revisions list \
    --service ${SERVICE_NAME} \
    --platform managed \
    --region ${REGION} \
    --filter="status.conditions.status:True AND status.traffic.percent:100" \
    --limit 1 \
    --format="value(name)")

echo -e "${YELLOW}Current revision: ${CURRENT_REVISION}${NC}"

# Get previous revision
PREVIOUS_REVISION=$(gcloud run revisions list \
    --service ${SERVICE_NAME} \
    --platform managed \
    --region ${REGION} \
    --filter="status.conditions.status:True" \
    --limit 2 \
    --format="value(name)" | tail -n 1)

if [ -z "$PREVIOUS_REVISION" ]; then
    echo -e "${RED}Error: No previous revision found${NC}"
    exit 1
fi

echo -e "${YELLOW}Previous revision: ${PREVIOUS_REVISION}${NC}"
echo ""

# Perform rollback
echo -e "${YELLOW}Rolling back to ${PREVIOUS_REVISION}...${NC}"
gcloud run services update-traffic ${SERVICE_NAME} \
    --to-revisions ${PREVIOUS_REVISION}=100 \
    --platform managed \
    --region ${REGION}

echo -e "${GREEN}✓ Traffic migrated to previous revision${NC}"
echo ""

# Verify rollback
SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME} --platform managed --region ${REGION} --format 'value(status.url)')

echo -e "${YELLOW}Verifying rollback...${NC}"
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
echo -e "${GREEN}Rollback Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "Environment: ${ENVIRONMENT}"
echo -e "Previous revision: ${CURRENT_REVISION}"
echo -e "Current revision: ${PREVIOUS_REVISION}"
echo -e "Service URL: ${SERVICE_URL}"
echo ""
