#!/bin/bash

# Build script for Terminal Application
# This script builds and pushes Docker images for frontend and backend

set -e

# Configuration
REGISTRY="${DOCKER_REGISTRY:-docker.io/michelix}"
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

