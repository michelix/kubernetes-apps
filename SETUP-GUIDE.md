# 🚀 Kubernetes Applications GitOps Setup Guide

This guide will help you set up a complete GitOps workflow using ArgoCD and this repository.

## 📋 Prerequisites

- Kubernetes cluster with ArgoCD installed
- GitHub account
- Domain name (optional, for ingress configuration)
- Basic knowledge of Kubernetes and Git

## 🏗️ Architecture Overview

```
GitHub Repository → ArgoCD → Kubernetes Cluster
     ↓                ↓           ↓
  Manifests      Sync Policy    Applications
```

## 🚀 Quick Start

### 1. **Fork and Clone Repository**

```bash
# Fork this repository on GitHub, then clone your fork
git clone https://github.com/YOUR_USERNAME/kubernetes-apps.git
cd kubernetes-apps
```

### 2. **Configure Your Environment**

```bash
# Run the setup script
./setup.sh

# Edit the generated config file with your values
nano config
```

**Required Configuration:**
- `DOMAIN`: Your domain name (e.g., example.com)
- `LOCATION`: Your city name
- `LATITUDE`: Your latitude
- `LONGITUDE`: Your longitude
- `TIMEZONE`: Your timezone

### 3. **Update Configuration Files**

```bash
# Run setup again to apply your configuration
./setup.sh
```

### 4. **Commit and Push Changes**

```bash
git add .
git commit -m "feat: configure environment for GitOps deployment"
git push origin main
```

### 5. **Set up ArgoCD**

```bash
# Set your kubeconfig
export KUBECONFIG=/path/to/your/kubeconfig.yml

# Run the ArgoCD setup script
./argocd-setup.sh
```

## 🔧 Detailed Configuration

### **Repository Structure**

```
kubernetes-apps/
├── applications/
│   ├── homepage/
│   │   ├── application.yaml
│   │   └── manifests/
│   ├── monitoring/
│   │   ├── application.yaml
│   │   └── manifests/
│   ├── ingress/
│   │   ├── application.yaml
│   │   └── manifests/
│   └── secrets/
│       ├── application.yaml
│       └── manifests/
├── setup.sh
├── argocd-setup.sh
├── config.example
└── README.md
```

### **Application Configuration**

Each application has:
- `application.yaml`: ArgoCD Application definition
- `manifests/`: Kubernetes resource manifests

### **ArgoCD Application Properties**

- **Sync Policy**: Automated with self-healing
- **Prune**: Enabled for cleanup
- **Create Namespace**: Enabled
- **Self-Heal**: Enabled

## 🛠️ Management Commands

### **ArgoCD Commands**

```bash
# Check application status
argocd app get homepage

# Sync application
argocd app sync homepage

# Check all applications
argocd app list

# Get application logs
argocd app logs homepage
```

### **Kubernetes Commands**

```bash
# Check application status
kubectl get pods -n homepage
kubectl get svc -n homepage
kubectl get ingress -n homepage

# Check all namespaces
kubectl get namespaces
```

## 🔒 Security Best Practices

### **1. Separate Sensitive Data**

- Keep secrets in separate private repositories
- Use external secret management (e.g., Sealed Secrets, External Secrets Operator)
- Never commit sensitive information to public repositories

### **2. RBAC Configuration**

- Use least privilege principle
- Separate service accounts for different applications
- Implement proper namespace isolation

### **3. Network Security**

- Use proper ingress security
- Implement network policies
- Use TLS certificates for all external access

## 🔄 GitOps Workflow

### **Development Process**

1. **Make Changes**: Edit manifests in your local repository
2. **Test Changes**: Validate manifests locally
3. **Commit Changes**: Use conventional commit messages
4. **Push Changes**: Push to GitHub
5. **ArgoCD Sync**: ArgoCD automatically syncs changes
6. **Verify Deployment**: Check application status

### **Conventional Commits**

```bash
# Feature
git commit -m "feat: add new monitoring dashboard"

# Bug fix
git commit -m "fix: resolve ingress configuration issue"

# Documentation
git commit -m "docs: update setup guide"

# Configuration
git commit -m "config: update domain settings"
```

## 🚨 Troubleshooting

### **Common Issues**

1. **ArgoCD Connection Issues**
   ```bash
   # Check ArgoCD server status
   kubectl get pods -n argocd
   
   # Check ArgoCD logs
   kubectl logs -n argocd deployment/argocd-server
   ```

2. **Application Sync Issues**
   ```bash
   # Check application status
   argocd app get homepage
   
   # Force sync
   argocd app sync homepage --force
   ```

3. **Kubernetes Resource Issues**
   ```bash
   # Check resource status
   kubectl get all -n homepage
   
   # Check events
   kubectl get events -n homepage
   ```

### **Debugging Steps**

1. Check ArgoCD application status
2. Verify Kubernetes resource creation
3. Check application logs
4. Validate manifest syntax
5. Check network connectivity

## 📚 Advanced Configuration

### **Multi-Environment Setup**

```bash
# Development environment
argocd app create homepage-dev \
  --repo https://github.com/YOUR_USERNAME/kubernetes-apps.git \
  --path applications/homepage/manifests \
  --dest-server https://kubernetes.default.svc \
  --dest-namespace homepage-dev

# Production environment
argocd app create homepage-prod \
  --repo https://github.com/YOUR_USERNAME/kubernetes-apps.git \
  --path applications/homepage/manifests \
  --dest-server https://kubernetes.default.svc \
  --dest-namespace homepage-prod
```

### **Custom Sync Policies**

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: homepage
spec:
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
      - PrunePropagationPolicy=foreground
      - PruneLast=true
```

## 🎯 Next Steps

1. **Add More Applications**: Create additional applications following the same pattern
2. **Implement CI/CD**: Add GitHub Actions for automated testing
3. **Enhance Monitoring**: Add Prometheus and Grafana
4. **Implement Security**: Add security scanning and policy enforcement
5. **Scale Operations**: Implement multi-cluster management

## 📞 Support

- **Documentation**: Check the README.md and GITOPS-WORKFLOW.md
- **Issues**: Create GitHub issues for bugs and feature requests
- **Community**: Join the Kubernetes community for support

---

This GitOps setup provides a robust, automated deployment pipeline for all your Kubernetes applications! 🚀
