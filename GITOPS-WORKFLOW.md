# 🚀 GitOps Workflow: Kubernetes Applications

This document demonstrates a complete GitOps workflow using GitHub, ArgoCD, and Kubernetes.

## 📋 Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   GitHub        │    │   ArgoCD        │    │   Kubernetes    │
│   (GitOps)      │───▶│   (Deployment)  │───▶│   (Runtime)     │
│                 │    │                 │    │                 │
│ • Manifests     │    │ • Sync Policy   │    │ • Pods          │
│ • K8s Resources │    │ • Health Check │    │ • Services      │
│ • RBAC          │    │ • Rollback      │    │ • Ingress       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🔄 Complete Workflow

### 1. **GitOps Repository (GitHub)**
```bash
# Clone the GitOps repository
git clone https://github.com/YOUR_USERNAME/kubernetes-apps.git
cd kubernetes-apps

# Configure your environment
./setup.sh

# Make changes to manifests
# Edit applications/homepage/manifests/configmap.yaml
# Update configuration, add new services, etc.

git add .
git commit -m "feat: update homepage configuration"
git push origin main
```

### 2. **ArgoCD Deployment (Automatic)**
- ArgoCD detects changes in GitOps repository
- Automatically syncs changes to Kubernetes
- Creates/updates resources in the cluster
- Provides deployment visibility and rollback

### 3. **Runtime (Kubernetes)**
- Homepage application runs in `homepage` namespace
- Accessible via your configured domain
- Monitors other services in your homelab

## 🛠️ Implementation Steps

### Step 1: Set up GitOps Repository

```bash
# Create repository on GitHub
# Fork or clone this repository
git clone https://github.com/YOUR_USERNAME/kubernetes-apps.git
cd kubernetes-apps

# Configure your environment
./setup.sh
```

### Step 2: Push GitOps Manifests

```bash
# Initialize and push to GitHub
git add .
git commit -m "feat: add homepage GitOps application"
git push origin main
```

### Step 3: Create ArgoCD Application

```bash
# Login to ArgoCD
argocd login YOUR_ARGOCD_DOMAIN --username admin --password $(kubectl get secret argocd-initial-admin-secret -n argocd -o jsonpath='{.data.password}' | base64 -d)

# Create application
argocd app create homepage \
  --repo https://github.com/YOUR_USERNAME/kubernetes-apps.git \
  --path applications/homepage/manifests \
  --dest-server https://kubernetes.default.svc \
  --dest-namespace homepage \
  --sync-policy automated \
  --self-heal \
  --auto-prune
```

### Step 4: Verify Deployment

```bash
# Check application status
argocd app get homepage

# Check Kubernetes resources
kubectl get pods -n homepage
kubectl get svc -n homepage
kubectl get ingress -n homepage

# Access application
curl -k https://homepage.YOUR_DOMAIN
```

## 🔧 Configuration Examples

### Homepage Configuration (ConfigMap)
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: homepage
  namespace: homepage
data:
  services.yaml: |
    - Hypervisor:
        - Proxmox:
            icon: proxmox.png
            href: https://pve.YOUR_DOMAIN:8006/
    - Proxy:
        - Traefik:
            icon: traefik.png
            href: https://traefik.YOUR_DOMAIN/dashboard/
        - ArgoCD:
            icon: argocd.png
            href: https://argocd.YOUR_DOMAIN
        - Gitea:
            icon: gitea.png
            href: https://gitea.YOUR_DOMAIN
```

### ArgoCD Application Definition
```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: homepage
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/YOUR_USERNAME/kubernetes-apps.git
    targetRevision: HEAD
    path: applications/homepage/manifests
  destination:
    server: https://kubernetes.default.svc
    namespace: homepage
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

## 🎯 Best Practices

### 1. **Repository Structure**
```
gitops-homepage/
├── applications/
│   └── homepage/
│       ├── application.yaml
│       └── manifests/
│           ├── namespace.yaml
│           ├── configmap.yaml
│           ├── deployment.yaml
│           ├── service.yaml
│           ├── ingress.yaml
│           └── rbac.yaml
├── README.md
└── setup-gitops.sh
```

### 2. **GitOps Principles**
- ✅ **Declarative**: All configuration in Git
- ✅ **Automated**: No manual deployment steps
- ✅ **Auditable**: Full change history
- ✅ **Rollback**: Easy to revert changes
- ✅ **Consistent**: Same process for all applications

### 3. **Security**
- Use RBAC for service accounts
- Separate secrets from manifests
- Use proper namespace isolation
- Implement proper ingress security

### 4. **Monitoring**
- Use ArgoCD for deployment monitoring
- Use Homepage for service monitoring
- Implement proper logging
- Set up alerts for failures

## 🔄 Workflow Benefits

### **Development Process**
1. **Develop** application in GitHub
2. **Update** manifests in GitOps repository
3. **Commit** changes to GitOps repository
4. **ArgoCD** automatically deploys changes
5. **Verify** deployment in ArgoCD UI

### **Advantages**
- 🚀 **Fast deployment** - automated sync
- 🔒 **Secure** - all changes tracked in Git
- 🔄 **Rollback** - easy to revert changes
- 📊 **Visibility** - clear deployment status
- 🛠️ **Consistent** - same process for all apps

## 📚 Next Steps

### 1. **Add More Applications**
- Create GitOps repositories for other services
- Use consistent structure and naming
- Implement proper RBAC and security

### 2. **Implement CI/CD**
- Add GitHub Actions for automated testing
- Implement quality gates and security scans
- Add automated manifest validation

### 3. **Enhance Monitoring**
- Add Prometheus and Grafana
- Implement proper logging with ELK stack
- Set up alerting for critical services

### 4. **Environment Promotion**
- Implement dev/staging/prod environments
- Use GitOps for environment promotion
- Add proper testing and validation

## 🎉 Conclusion

This GitOps workflow provides:
- ✅ **Automated deployment** of your homelab applications
- ✅ **Version control** for all configuration
- ✅ **Easy rollback** and recovery
- ✅ **Consistent process** for all services
- ✅ **Full visibility** into deployment status

Your homelab is now running on a production-grade GitOps platform! 🚀
