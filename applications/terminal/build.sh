#!/bin/bash

# Build script for Terminal Application
# This script builds and pushes Docker images for frontend and backend

set -e

# Load registry from config file if available (from repository root)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
CONFIG_FILE="${REPO_ROOT}/config"

# Configuration
# Priority: 1. DOCKER_REGISTRY env var, 2. config file, 3. default placeholder
if [ -z "${DOCKER_REGISTRY}" ] && [ -f "${CONFIG_FILE}" ]; then
    # DOCKER_REGISTRY will be loaded from config file if not set as env var
    source "${CONFIG_FILE}"
fi
REGISTRY="${DOCKER_REGISTRY:-YOUR_REGISTRY}"
# Use commit hash if available, otherwise use VERSION or latest
if [ -d .git ] && command -v git &> /dev/null; then
  COMMIT_SHA=$(git rev-parse --short HEAD 2>/dev/null || echo "")
  VERSION="${VERSION:-${COMMIT_SHA:-latest}}"
else
  VERSION="${VERSION:-latest}"
fi

echo "🔨 Building Terminal Application Docker Images"
echo "=============================================="
echo "Registry: ${REGISTRY}"
echo "Version: ${VERSION}"
if [ -n "${COMMIT_SHA}" ]; then
  echo "Commit: ${COMMIT_SHA}"
fi
echo ""

# Validate registry is not a placeholder
if [ "${REGISTRY}" = "YOUR_REGISTRY" ] || [ -z "${REGISTRY}" ]; then
    echo "❌ Error: DOCKER_REGISTRY is not set!"
    echo ""
    echo "Please set DOCKER_REGISTRY in one of the following ways:"
    echo "1. Environment variable: export DOCKER_REGISTRY=docker.io/username"
    echo "2. Config file: Add DOCKER_REGISTRY=docker.io/username to ${CONFIG_FILE}"
    echo "3. Run configure.sh from repository root to set up config file"
    exit 1
fi
echo ""

# Build Frontend
echo "📦 Building frontend image..."
cd frontend
docker build -t ${REGISTRY}/terminal-frontend:${VERSION} .
docker tag ${REGISTRY}/terminal-frontend:${VERSION} ${REGISTRY}/terminal-frontend:latest
echo "✅ Frontend image built successfully"
echo ""

# Build Backend
echo "📦 Building backend image..."
cd ../backend
docker build -t ${REGISTRY}/terminal-backend:${VERSION} .
docker tag ${REGISTRY}/terminal-backend:${VERSION} ${REGISTRY}/terminal-backend:latest
echo "✅ Backend image built successfully"
echo ""

# Push images (set PUSH_IMAGES=true to enable)
if [ "${PUSH_IMAGES}" = "true" ]; then
    echo "📤 Pushing images to registry..."
    docker push ${REGISTRY}/terminal-frontend:${VERSION}
    docker push ${REGISTRY}/terminal-frontend:latest
    docker push ${REGISTRY}/terminal-backend:${VERSION}
    docker push ${REGISTRY}/terminal-backend:latest
    echo "✅ Images pushed successfully"
else
    echo "ℹ️  Skipping push (set PUSH_IMAGES=true to push images)"
fi

echo ""
echo "🎉 Build complete!"
echo ""
echo "Next steps:"
echo "1. Update manifests/frontend-deployment.yaml with: ${REGISTRY}/terminal-frontend:${VERSION}"
echo "2. Update manifests/backend-deployment.yaml with: ${REGISTRY}/terminal-backend:${VERSION}"
echo "3. Push images: docker push ${REGISTRY}/terminal-frontend:${VERSION} && docker push ${REGISTRY}/terminal-backend:${VERSION}"
echo "4. Update application.yaml with your GitHub repository URL"
echo "5. Commit and push to GitHub"
echo "6. ArgoCD will automatically deploy the application"

