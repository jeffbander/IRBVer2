#!/bin/bash

# ===============================================================================
# Setup GCP Secret Manager
# ===============================================================================
# This script creates and populates secrets in GCP Secret Manager
#
# Usage:
#   ./scripts/setup-gcp-secrets.sh [staging|production]
#
# Example:
#   ./scripts/setup-gcp-secrets.sh staging
# ===============================================================================

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check arguments
if [ $# -eq 0 ]; then
    echo -e "${RED}Error: Environment not specified${NC}"
    echo "Usage: $0 [staging|production]"
    exit 1
fi

ENVIRONMENT=$1

# Set project based on environment
if [ "$ENVIRONMENT" = "staging" ]; then
    PROJECT_ID=${GCP_PROJECT_ID_STAGING}
elif [ "$ENVIRONMENT" = "production" ]; then
    PROJECT_ID=${GCP_PROJECT_ID_PRODUCTION}
else
    echo -e "${RED}Error: Invalid environment. Use 'staging' or 'production'${NC}"
    exit 1
fi

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Setting up secrets for: ${ENVIRONMENT}${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Set GCP project
gcloud config set project $PROJECT_ID

# Enable Secret Manager API
echo -e "${YELLOW}Enabling Secret Manager API...${NC}"
gcloud services enable secretmanager.googleapis.com
echo -e "${GREEN}✓ API enabled${NC}"
echo ""

# Function to create or update secret
create_or_update_secret() {
    local SECRET_NAME=$1
    local SECRET_VALUE=$2
    local DESCRIPTION=$3

    echo -e "${YELLOW}Creating secret: ${SECRET_NAME}${NC}"

    # Check if secret exists
    if gcloud secrets describe ${SECRET_NAME} &>/dev/null; then
        echo -e "${YELLOW}Secret exists, adding new version...${NC}"
        echo -n "${SECRET_VALUE}" | gcloud secrets versions add ${SECRET_NAME} --data-file=-
    else
        echo -e "${YELLOW}Creating new secret...${NC}"
        echo -n "${SECRET_VALUE}" | gcloud secrets create ${SECRET_NAME} \
            --data-file=- \
            --replication-policy="automatic" \
            --labels="environment=${ENVIRONMENT},managed-by=script"
    fi

    echo -e "${GREEN}✓ Secret ${SECRET_NAME} configured${NC}"
    echo ""
}

# DATABASE_URL (managed by Terraform, but can be set manually)
echo -e "${YELLOW}Enter DATABASE_URL (or press Enter to skip):${NC}"
read -r DATABASE_URL
if [ -n "$DATABASE_URL" ]; then
    create_or_update_secret "DATABASE_URL_${ENVIRONMENT^^}" "$DATABASE_URL" "PostgreSQL connection string"
fi

# JWT_SECRET (auto-generate if not provided)
echo -e "${YELLOW}Enter JWT_SECRET (or press Enter to auto-generate):${NC}"
read -r JWT_SECRET
if [ -z "$JWT_SECRET" ]; then
    JWT_SECRET=$(openssl rand -base64 64 | tr -d '\n')
    echo -e "${GREEN}Generated JWT_SECRET${NC}"
fi
create_or_update_secret "JWT_SECRET_${ENVIRONMENT^^}" "$JWT_SECRET" "JWT signing secret"

# AIGENTS_WEBHOOK_SECRET
echo -e "${YELLOW}Enter AIGENTS_WEBHOOK_SECRET:${NC}"
read -r AIGENTS_WEBHOOK_SECRET
if [ -n "$AIGENTS_WEBHOOK_SECRET" ]; then
    create_or_update_secret "AIGENTS_WEBHOOK_SECRET_${ENVIRONMENT^^}" "$AIGENTS_WEBHOOK_SECRET" "Aigents webhook secret"
fi

# AIGENTS_FOLDER_ID
echo -e "${YELLOW}Enter AIGENTS_FOLDER_ID:${NC}"
read -r AIGENTS_FOLDER_ID
if [ -n "$AIGENTS_FOLDER_ID" ]; then
    create_or_update_secret "AIGENTS_FOLDER_ID" "$AIGENTS_FOLDER_ID" "Aigents AppSheet folder ID"
fi

# AIGENTS_API_URL
echo -e "${YELLOW}Enter AIGENTS_API_URL (default: https://start-chain-run-943506065004.us-central1.run.app):${NC}"
read -r AIGENTS_API_URL
AIGENTS_API_URL=${AIGENTS_API_URL:-https://start-chain-run-943506065004.us-central1.run.app}
create_or_update_secret "AIGENTS_API_URL" "$AIGENTS_API_URL" "Aigents API endpoint"

# AIGENTS_EMAIL
echo -e "${YELLOW}Enter AIGENTS_EMAIL (default: notifications@providerloop.com):${NC}"
read -r AIGENTS_EMAIL
AIGENTS_EMAIL=${AIGENTS_EMAIL:-notifications@providerloop.com}
create_or_update_secret "AIGENTS_EMAIL" "$AIGENTS_EMAIL" "Aigents notification email"

# Optional: SMTP settings
echo -e "${YELLOW}Configure SMTP settings? (y/n):${NC}"
read -r CONFIGURE_SMTP
if [ "$CONFIGURE_SMTP" = "y" ]; then
    echo -e "${YELLOW}Enter SMTP_HOST:${NC}"
    read -r SMTP_HOST
    create_or_update_secret "SMTP_HOST" "$SMTP_HOST" "SMTP server host"

    echo -e "${YELLOW}Enter SMTP_PORT:${NC}"
    read -r SMTP_PORT
    create_or_update_secret "SMTP_PORT" "$SMTP_PORT" "SMTP server port"

    echo -e "${YELLOW}Enter SMTP_USER:${NC}"
    read -r SMTP_USER
    create_or_update_secret "SMTP_USER" "$SMTP_USER" "SMTP username"

    echo -e "${YELLOW}Enter SMTP_PASS:${NC}"
    read -s SMTP_PASS
    echo ""
    create_or_update_secret "SMTP_PASS" "$SMTP_PASS" "SMTP password"
fi

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Secrets Setup Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "To list all secrets:"
echo -e "  gcloud secrets list --filter='labels.environment=${ENVIRONMENT}'"
echo ""
echo -e "To view a secret:"
echo -e "  gcloud secrets versions access latest --secret=SECRET_NAME"
echo ""
