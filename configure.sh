#!/bin/bash

# Configuration Script for Kubernetes Applications
# This script helps you configure your personal information

set -e

echo "🔧 Configuring Kubernetes Applications"
echo "====================================="

# Check if config file exists
if [ ! -f "config" ]; then
    echo "📝 Creating configuration file..."
    cp config.template config
    echo "✅ Configuration file created: config"
    echo ""
    echo "Please edit the 'config' file with your values:"
    echo "- DOMAIN: Your domain name (e.g., example.com)"
    echo "- LOCATION: Your city name"
    echo "- LATITUDE: Your latitude"
    echo "- LONGITUDE: Your longitude"
    echo "- TIMEZONE: Your timezone"
    echo "- DOCKER_REGISTRY: Your Docker registry (e.g., docker.io/username)"
    echo "- REPO_USERNAME: Your GitHub username"
    echo ""
    echo "After editing the config file, run this script again."
    exit 0
fi

# Source the configuration
source config

# Validate required variables
if [ -z "${DOMAIN}" ] || [ "${DOMAIN}" = "your-domain.com" ]; then
    echo "❌ Error: DOMAIN is not set or is still the default value"
    echo "Please edit the 'config' file and set your domain"
    exit 1
fi

if [ -z "${DOCKER_REGISTRY}" ] || [ "${DOCKER_REGISTRY}" = "docker.io/YOUR_USERNAME" ]; then
    echo "❌ Error: DOCKER_REGISTRY is not set or is still the default value"
    echo "Please edit the 'config' file and set your Docker registry"
    exit 1
fi

if [ -z "${REPO_USERNAME}" ] || [ "${REPO_USERNAME}" = "YOUR_USERNAME" ]; then
    echo "❌ Error: REPO_USERNAME is not set or is still the default value"
    echo "Please edit the 'config' file and set your GitHub username"
    exit 1
fi

echo "🔧 Updating configuration files with your values..."

# Update homepage configmap
sed -i "s|YOUR_DOMAIN|${DOMAIN}|g" applications/homepage/manifests/configmap.yaml
sed -i "s|YOUR_LOCATION|${LOCATION}|g" applications/homepage/manifests/configmap.yaml
sed -i "s|YOUR_LATITUDE|${LATITUDE}|g" applications/homepage/manifests/configmap.yaml
sed -i "s|YOUR_LONGITUDE|${LONGITUDE}|g" applications/homepage/manifests/configmap.yaml
sed -i "s|YOUR_TIMEZONE|${TIMEZONE}|g" applications/homepage/manifests/configmap.yaml
sed -i "s|YOUR_HOMEPAGE_HOSTNAME|${HOMEPAGE_HOSTNAME}|g" applications/homepage/manifests/configmap.yaml
sed -i "s|YOUR_HOMEPAGE_TITLE|${HOMEPAGE_TITLE}|g" applications/homepage/manifests/configmap.yaml

# Update homepage deployment (replace YOUR_DOMAIN with actual domain)
sed -i "s|homepage.YOUR_DOMAIN|homepage.${DOMAIN}|g" applications/homepage/manifests/deployment.yaml

# Update homepage ingress
sed -i "s|YOUR_DOMAIN|${DOMAIN}|g" applications/homepage/manifests/ingress.yaml

# Update terminal ingress
sed -i "s|YOUR_DOMAIN|${DOMAIN}|g" applications/terminal/manifests/ingress.yaml

# Update terminal deployment manifests with Docker registry
sed -i "s|YOUR_REGISTRY|${DOCKER_REGISTRY}|g" applications/terminal/manifests/frontend-deployment.yaml
sed -i "s|YOUR_REGISTRY|${DOCKER_REGISTRY}|g" applications/terminal/manifests/backend-deployment.yaml

# Update terminal application.yaml with GitHub username
sed -i "s|YOUR_USERNAME|${REPO_USERNAME}|g" applications/terminal/application.yaml

echo "✅ Configuration updated successfully!"
echo ""

# Check if deploy branch exists and update it too
CURRENT_BRANCH=$(git branch --show-current 2>/dev/null || echo "")
if [ -n "${CURRENT_BRANCH}" ] && git ls-remote --heads origin deploy | grep -q deploy; then
    echo "🔄 Updating deploy branch with configuration..."
    
    # Save current branch
    ORIGINAL_BRANCH="${CURRENT_BRANCH}"
    
    # Fetch latest deploy branch
    git fetch origin deploy 2>/dev/null || true
    
    # Checkout deploy branch
    git checkout deploy 2>/dev/null || {
        echo "⚠️  Could not checkout deploy branch, skipping deploy branch update"
        git checkout "${ORIGINAL_BRANCH}" 2>/dev/null || true
    }
    
    if [ "$(git branch --show-current)" = "deploy" ]; then
        # Apply the same replacements on deploy branch
        echo "   Applying configuration to deploy branch..."
        
        # Update homepage configmap
        sed -i "s|YOUR_DOMAIN|${DOMAIN}|g" applications/homepage/manifests/configmap.yaml 2>/dev/null || true
        sed -i "s|YOUR_LOCATION|${LOCATION}|g" applications/homepage/manifests/configmap.yaml 2>/dev/null || true
        sed -i "s|YOUR_LATITUDE|${LATITUDE}|g" applications/homepage/manifests/configmap.yaml 2>/dev/null || true
        sed -i "s|YOUR_LONGITUDE|${LONGITUDE}|g" applications/homepage/manifests/configmap.yaml 2>/dev/null || true
        sed -i "s|YOUR_TIMEZONE|${TIMEZONE}|g" applications/homepage/manifests/configmap.yaml 2>/dev/null || true
        sed -i "s|YOUR_HOMEPAGE_HOSTNAME|${HOMEPAGE_HOSTNAME}|g" applications/homepage/manifests/configmap.yaml 2>/dev/null || true
        sed -i "s|YOUR_HOMEPAGE_TITLE|${HOMEPAGE_TITLE}|g" applications/homepage/manifests/configmap.yaml 2>/dev/null || true
        
        # Update homepage deployment
        sed -i "s|homepage.YOUR_DOMAIN|homepage.${DOMAIN}|g" applications/homepage/manifests/deployment.yaml 2>/dev/null || true
        
        # Update homepage ingress
        sed -i "s|YOUR_DOMAIN|${DOMAIN}|g" applications/homepage/manifests/ingress.yaml 2>/dev/null || true
        
        # Update terminal ingress
        sed -i "s|YOUR_DOMAIN|${DOMAIN}|g" applications/terminal/manifests/ingress.yaml 2>/dev/null || true
        
        # Update terminal deployment manifests
        sed -i "s|YOUR_REGISTRY|${DOCKER_REGISTRY}|g" applications/terminal/manifests/frontend-deployment.yaml 2>/dev/null || true
        sed -i "s|YOUR_REGISTRY|${DOCKER_REGISTRY}|g" applications/terminal/manifests/backend-deployment.yaml 2>/dev/null || true
        
        # Update terminal application.yaml
        sed -i "s|YOUR_USERNAME|${REPO_USERNAME}|g" applications/terminal/application.yaml 2>/dev/null || true
        
        # Check if there are changes
        if ! git diff --quiet || ! git diff --cached --quiet; then
            git add -A
            git commit -m "chore: apply configuration from configure.sh script" || true
            echo "   ✅ Deploy branch updated and committed"
        else
            echo "   ℹ️  No changes needed in deploy branch"
        fi
        
        # Switch back to original branch
        git checkout "${ORIGINAL_BRANCH}" 2>/dev/null || true
    fi
fi

echo "📋 Your configuration:"
echo "Domain: ${DOMAIN}"
echo "Location: ${LOCATION}"
echo "Coordinates: ${LATITUDE}, ${LONGITUDE}"
echo "Timezone: ${TIMEZONE}"
echo "Docker Registry: ${DOCKER_REGISTRY}"
echo "GitHub Username: ${REPO_USERNAME}"
echo ""
echo "📝 Next steps:"
echo "1. Review the updated configuration files"
echo "2. Build Docker images: cd applications/terminal && ./build.sh"
echo "3. Commit and push your changes to GitHub"
echo "4. Configure ArgoCD to use this repository"
echo ""
echo "🔗 ArgoCD Application Creation:"
echo "Application Name: homepage"
echo "Repository URL: https://github.com/${REPO_USERNAME}/kubernetes-apps.git"
echo "Path: applications/homepage/manifests"
echo "Cluster URL: https://kubernetes.default.svc"
echo "Namespace: homepage"
