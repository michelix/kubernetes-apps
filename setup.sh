#!/bin/bash

# Kubernetes Applications Setup Script
# This script helps you configure the GitOps repository for your environment

set -e

echo "🚀 Setting up Kubernetes Applications GitOps Repository"
echo "=================================================="

# Check if config file exists
if [ ! -f "config" ]; then
    echo "📝 Creating configuration file..."
    cp config.example config
    echo "✅ Configuration file created. Please edit 'config' with your values."
    echo ""
    echo "Required configuration:"
    echo "- DOMAIN: Your domain name (e.g., example.com)"
    echo "- LOCATION: Your city name"
    echo "- LATITUDE: Your latitude"
    echo "- LONGITUDE: Your longitude"
    echo "- TIMEZONE: Your timezone"
    echo ""
    echo "After editing the config file, run this script again."
    exit 0
fi

# Source the configuration
source config

echo "🔧 Updating configuration files..."

# Update homepage configmap
sed -i "s/YOUR_DOMAIN/${DOMAIN}/g" applications/homepage/manifests/configmap.yaml
sed -i "s/YOUR_LOCATION/${LOCATION}/g" applications/homepage/manifests/configmap.yaml
sed -i "s/YOUR_LATITUDE/${LATITUDE}/g" applications/homepage/manifests/configmap.yaml
sed -i "s/YOUR_LONGITUDE/${LONGITUDE}/g" applications/homepage/manifests/configmap.yaml
sed -i "s/YOUR_TIMEZONE/${TIMEZONE}/g" applications/homepage/manifests/configmap.yaml

# Update homepage ingress
sed -i "s/YOUR_DOMAIN/${DOMAIN}/g" applications/homepage/manifests/ingress.yaml

echo "✅ Configuration updated successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Review the updated configuration files"
echo "2. Commit and push your changes to GitHub"
echo "3. Configure ArgoCD to use this repository"
echo ""
echo "🔗 ArgoCD Application Creation:"
echo "argocd app create homepage \\"
echo "  --repo https://github.com/YOUR_USERNAME/kubernetes-apps.git \\"
echo "  --path applications/homepage/manifests \\"
echo "  --dest-server https://kubernetes.default.svc \\"
echo "  --dest-namespace homepage \\"
echo "  --sync-policy automated \\"
echo "  --self-heal \\"
echo "  --auto-prune"
