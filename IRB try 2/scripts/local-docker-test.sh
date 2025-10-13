#!/bin/bash

# ===============================================================================
# Local Docker Test
# ===============================================================================
# Test the production Docker image locally before deployment
#
# Usage:
#   ./scripts/local-docker-test.sh
# ===============================================================================

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

CONTAINER_NAME="irb-system-test"
IMAGE_NAME="irb-system:local-test"
PORT=3000

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Local Docker Test${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Stop and remove existing container
if [ "$(docker ps -aq -f name=${CONTAINER_NAME})" ]; then
    echo -e "${YELLOW}Stopping existing container...${NC}"
    docker stop ${CONTAINER_NAME} || true
    docker rm ${CONTAINER_NAME} || true
fi

# Build image
echo -e "${YELLOW}Building Docker image...${NC}"
docker build -t ${IMAGE_NAME} -f Dockerfile.production .
echo -e "${GREEN}✓ Image built${NC}"
echo ""

# Run container
echo -e "${YELLOW}Starting container...${NC}"
docker run -d \
    --name ${CONTAINER_NAME} \
    -p ${PORT}:8080 \
    -e NODE_ENV=production \
    -e DATABASE_URL="file:./dev.db" \
    -e JWT_SECRET="test-secret-for-local-docker" \
    -e AIGENTS_WEBHOOK_SECRET="test-webhook" \
    -e AIGENTS_FOLDER_ID="test-folder" \
    -e AIGENTS_API_URL="https://start-chain-run-943506065004.us-central1.run.app" \
    -e AIGENTS_EMAIL="notifications@providerloop.com" \
    -e USE_AIGENTS_MOCK="true" \
    ${IMAGE_NAME}

echo -e "${GREEN}✓ Container started${NC}"
echo ""

# Wait for container to be ready
echo -e "${YELLOW}Waiting for container to be ready...${NC}"
for i in {1..30}; do
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:${PORT}/api/health | grep -q "200"; then
        echo -e "${GREEN}✓ Container is healthy${NC}"
        break
    fi

    if [ $i -eq 30 ]; then
        echo -e "${RED}✗ Container failed to become healthy${NC}"
        echo -e "${YELLOW}Container logs:${NC}"
        docker logs ${CONTAINER_NAME}
        exit 1
    fi

    echo "Waiting... ($i/30)"
    sleep 2
done
echo ""

# Run tests
echo -e "${YELLOW}Running health checks...${NC}"

# Test health endpoint
HEALTH_STATUS=$(curl -s http://localhost:${PORT}/api/health)
echo -e "Health endpoint: ${HEALTH_STATUS}"

# Test that container is responding
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:${PORT})
echo -e "HTTP status code: ${HTTP_CODE}"

echo ""

# Show container info
echo -e "${YELLOW}Container information:${NC}"
docker ps -f name=${CONTAINER_NAME}
echo ""

# Show logs
echo -e "${YELLOW}Recent logs:${NC}"
docker logs --tail 20 ${CONTAINER_NAME}
echo ""

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Local Docker Test Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "Application is running at: http://localhost:${PORT}"
echo ""
echo -e "Useful commands:"
echo -e "  View logs:    docker logs -f ${CONTAINER_NAME}"
echo -e "  Stop:         docker stop ${CONTAINER_NAME}"
echo -e "  Remove:       docker rm ${CONTAINER_NAME}"
echo -e "  Shell access: docker exec -it ${CONTAINER_NAME} /bin/sh"
echo ""
echo -e "Press Ctrl+C to continue (container will keep running)"
echo ""

# Keep script running
tail -f /dev/null
