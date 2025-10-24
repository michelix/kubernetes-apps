#!/bin/bash

# ArgoCD Setup Script for Kubernetes Applications
# This script helps you configure ArgoCD to use this GitOps repository

set -e

echo "🚀 Setting up ArgoCD for Kubernetes Applications"
echo "================================================"

# Check if kubeconfig is set
if [ -z "$KUBECONFIG" ]; then
    echo "❌ KUBECONFIG environment variable is not set"
    echo "Please set KUBECONFIG to your Kubernetes cluster configuration"
    echo "Example: export KUBECONFIG=/path/to/your/kubeconfig.yml"
    exit 1
fi

# Check if kubectl can connect to cluster
if ! kubectl cluster-info &> /dev/null; then
    echo "❌ Cannot connect to Kubernetes cluster"
    echo "Please check your KUBECONFIG and cluster connectivity"
    exit 1
fi

echo "✅ Kubernetes cluster connection verified"

# Check if ArgoCD is installed
if ! kubectl get namespace argocd &> /dev/null; then
    echo "❌ ArgoCD namespace not found"
    echo "Please install ArgoCD first:"
    echo "kubectl create namespace argocd"
    echo "kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml"
    exit 1
fi

echo "✅ ArgoCD namespace found"

# Get ArgoCD admin password
ARGOCD_PASSWORD=$(kubectl get secret argocd-initial-admin-secret -n argocd -o jsonpath='{.data.password}' | base64 -d)
if [ -z "$ARGOCD_PASSWORD" ]; then
    echo "❌ Could not retrieve ArgoCD admin password"
    echo "Please check if ArgoCD is properly installed"
    exit 1
fi

echo "✅ ArgoCD admin password retrieved"

# Get ArgoCD server URL
ARGOCD_SERVER=$(kubectl get svc argocd-server -n argocd -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
if [ -z "$ARGOCD_SERVER" ]; then
    ARGOCD_SERVER=$(kubectl get svc argocd-server -n argocd -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
fi

if [ -z "$ARGOCD_SERVER" ]; then
    echo "⚠️  Could not determine ArgoCD server URL"
    echo "Please provide your ArgoCD server URL:"
    read -p "ArgoCD Server URL: " ARGOCD_SERVER
fi

echo "🔐 Logging into ArgoCD..."
argocd login $ARGOCD_SERVER --username admin --password $ARGOCD_PASSWORD --insecure

echo "📋 Creating ArgoCD Applications..."

# Create Homepage Application
echo "Creating Homepage application..."
argocd app create homepage \
  --repo https://github.com/YOUR_USERNAME/kubernetes-apps.git \
  --path applications/homepage/manifests \
  --dest-server https://kubernetes.default.svc \
  --dest-namespace homepage \
  --sync-policy automated \
  --self-heal \
  --auto-prune

# Create Monitoring Application
echo "Creating Monitoring application..."
argocd app create monitoring \
  --repo https://github.com/YOUR_USERNAME/kubernetes-apps.git \
  --path applications/monitoring/manifests \
  --dest-server https://kubernetes.default.svc \
  --dest-namespace monitoring \
  --sync-policy automated \
  --self-heal \
  --auto-prune

# Create Ingress Application
echo "Creating Ingress application..."
argocd app create ingress \
  --repo https://github.com/YOUR_USERNAME/kubernetes-apps.git \
  --path applications/ingress/manifests \
  --dest-server https://kubernetes.default.svc \
  --dest-namespace ingress-nginx \
  --sync-policy automated \
  --self-heal \
  --auto-prune

echo "✅ ArgoCD Applications created successfully!"
echo ""
echo "📊 Application Status:"
argocd app list
echo ""
echo "🔗 ArgoCD UI: https://$ARGOCD_SERVER"
echo "👤 Username: admin"
echo "🔑 Password: $ARGOCD_PASSWORD"
echo ""
echo "📋 Next steps:"
echo "1. Update the repository URL in the applications to point to your GitHub repository"
echo "2. Configure your domain names in the ingress files"
echo "3. Set up your monitoring and secrets applications"
echo ""
echo "🛠️  Useful commands:"
echo "argocd app get homepage"
echo "argocd app sync homepage"
echo "argocd app list"
