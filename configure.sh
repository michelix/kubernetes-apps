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
    echo ""
    echo "After editing the config file, run this script again."
    exit 0
fi

# Source the configuration
source config

echo "🔧 Updating configuration files with your values..."

# Update homepage configmap
sed -i "s|YOUR_DOMAIN|${DOMAIN}|g" applications/homepage/manifests/configmap.yaml
sed -i "s|YOUR_LOCATION|${LOCATION}|g" applications/homepage/manifests/configmap.yaml
sed -i "s|YOUR_LATITUDE|${LATITUDE}|g" applications/homepage/manifests/configmap.yaml
sed -i "s|YOUR_LONGITUDE|${LONGITUDE}|g" applications/homepage/manifests/configmap.yaml
sed -i "s|YOUR_TIMEZONE|${TIMEZONE}|g" applications/homepage/manifests/configmap.yaml
sed -i "s|YOUR_HOMEPAGE_HOSTNAME|${HOMEPAGE_HOSTNAME}|g" applications/homepage/manifests/configmap.yaml
sed -i "s|YOUR_HOMEPAGE_TITLE|${HOMEPAGE_TITLE}|g" applications/homepage/manifests/configmap.yaml

# Update homepage deployment
sed -i "s|YOUR_HOMEPAGE_HOSTNAME|${HOMEPAGE_HOSTNAME}|g" applications/homepage/manifests/deployment.yaml
sed -i "s|YOUR_HOMEPAGE_ALLOWED_HOSTS|${HOMEPAGE_ALLOWED_HOSTS}|g" applications/homepage/manifests/deployment.yaml

# Update homepage ingress
sed -i "s|YOUR_DOMAIN|${DOMAIN}|g" applications/homepage/manifests/ingress.yaml

echo "✅ Configuration updated successfully!"
echo ""
echo "📋 Your configuration:"
echo "Domain: ${DOMAIN}"
echo "Location: ${LOCATION}"
echo "Coordinates: ${LATITUDE}, ${LONGITUDE}"
echo "Timezone: ${TIMEZONE}"
echo ""
echo "📝 Next steps:"
echo "1. Review the updated configuration files"
echo "2. Commit and push your changes to GitHub"
echo "3. Configure ArgoCD to use this repository"
echo ""
echo "🔗 ArgoCD Application Creation:"
echo "Application Name: homepage"
echo "Repository URL: https://github.com/YOUR_USERNAME/kubernetes-apps.git"
echo "Path: applications/homepage/manifests"
echo "Cluster URL: https://kubernetes.default.svc"
echo "Namespace: homepage"
