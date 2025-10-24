# Kubernetes Applications

This repository contains Kubernetes applications managed by ArgoCD in a GitOps workflow.

## 🏗️ Architecture

```
GitHub (Source) → ArgoCD (Deployment) → Kubernetes
```

## 📁 Repository Structure

```
applications/
├── homepage/                    # Homepage application
│   ├── application.yaml        # ArgoCD Application definition
│   └── manifests/              # Kubernetes manifests
├── monitoring/                  # Monitoring stack
│   ├── application.yaml
│   └── manifests/
├── ingress/                     # Ingress controller
│   ├── application.yaml
│   └── manifests/
└── secrets/                     # Secret management
    ├── application.yaml
    └── manifests/
```

## 🚀 Applications

### Homepage
- **Purpose**: Dashboard for homelab services
- **Namespace**: `homepage`
- **Access**: Configure your domain in ingress.yaml

### Monitoring
- **Purpose**: Prometheus, Grafana, AlertManager
- **Namespace**: `monitoring`
- **Access**: Configure your domain in ingress.yaml

### Ingress
- **Purpose**: Nginx Ingress Controller
- **Namespace**: `ingress-nginx`
- **Access**: Load balancer for all services

## 🔧 ArgoCD Configuration

All applications are configured with:
- **Sync Policy**: Automated with self-healing
- **Prune**: Enabled for cleanup
- **Create Namespace**: Enabled

## 📋 Deployment Process

1. **Make changes** to manifests
2. **Commit and push** to GitHub
3. **ArgoCD automatically syncs** changes
4. **Applications deploy** to Kubernetes

## 🛠️ Management

### ArgoCD Commands
```bash
# Check application status
argocd app get homepage

# Sync application
argocd app sync homepage

# Check all applications
argocd app list
```

### Kubernetes Commands
```bash
# Check application status
kubectl get pods -n homepage
kubectl get pods -n monitoring
kubectl get pods -n ingress-nginx
```

## 🔗 Configuration

Update the following files with your specific configuration:
- **Domain names**: Update ingress.yaml files with your domain
- **Coordinates**: Update configmap.yaml with your location
- **Service URLs**: Update service endpoints in configmap.yaml

## 📚 Best Practices

1. **Separate applications** in different directories
2. **Use consistent naming** conventions
3. **Include documentation** for each application
4. **Test changes** before pushing to main
5. **Use semantic versioning** for releases
6. **Keep sensitive data** in separate private repositories

---

This GitOps setup provides a robust, automated deployment pipeline for all Kubernetes applications! 🚀