# Homepage Application

A beautiful, customizable dashboard for your homelab services with automatic service discovery.

## 🏗️ Architecture

- **Application**: [Homepage](https://gethomepage.dev/)
- **Namespace**: `homepage`
- **Ingress**: Cilium Ingress Controller
- **Service Discovery**: Automatic via Kubernetes Ingress annotations
- **Metrics**: Kubernetes metrics integration via Metrics Server

## 📁 Project Structure

```
homepage/
├── application.yaml        # ArgoCD Application definition
├── README.md              # This file
└── manifests/              # Kubernetes manifests
    ├── namespace.yaml      # Namespace definition
    ├── serviceaccount.yaml  # Service account
    ├── clusterrole.yaml     # RBAC permissions for metrics
    ├── clusterrolebinding.yaml
    ├── configmap.yaml      # Application configuration
    ├── deployment.yaml     # Application deployment
    ├── service.yaml        # Service definition
    └── ingress.yaml        # Ingress configuration
```

## 🚀 Getting Started

### Prerequisites

- Kubernetes cluster with:
  - ArgoCD installed and configured
  - Cilium Ingress Controller (or update ingressClassName)
  - Metrics Server installed (for Kubernetes widget)
- Domain name configured for DNS

### Configuration

The Homepage application requires configuration for:
- Domain name
- Location (for weather widget)
- Service URLs and icons
- Theme and layout preferences

**Important**: The manifests in this repository contain placeholders (`YOUR_DOMAIN`, etc.) to keep personal information out of the public repository.

#### Automated Configuration (Recommended)

This application uses a GitHub Actions workflow that automatically configures manifests and commits them to the `deploy` branch. ArgoCD syncs from the `deploy` branch.

**Required GitHub Secrets:**
- `DOMAIN`: Your domain name (e.g., `example.com`) - **Required**
- `GITHUB_USERNAME`: Your GitHub username - **Required**
- `LOCATION`: Your city name (optional, default: "Your City")
- `LATITUDE`: Your latitude (optional, default: "0.0")
- `LONGITUDE`: Your longitude (optional, default: "0.0")
- `TIMEZONE`: Your timezone (optional, default: "Europe/Berlin")

**How it works:**
1. When you push changes to `main` branch (homepage manifests or workflow)
2. GitHub Actions workflow triggers
3. Workflow reads secrets and replaces placeholders in manifests
4. Configured manifests are committed to `deploy` branch
5. ArgoCD automatically syncs from `deploy` branch

#### Manual Configuration (Alternative)

If you prefer to configure manually:

1. **Run configure.sh locally**:
```bash
# From repository root
./configure.sh
# Edit config file with your values
nano config
./configure.sh  # Apply configuration
```

2. **Commit and push to your own branch/fork**

3. **Update ArgoCD Application** to point to your branch

### Deploying with ArgoCD

1. **Configure GitHub Secrets** (see Configuration section above)

2. **Deploy Application**:

   **Option 1: Using kubectl** (Recommended)
   ```bash
   kubectl apply -f applications/homepage/application.yaml
   ```
   
   **Option 2: Using ArgoCD UI**
   - Application Name: `homepage`
   - Project: `default`
   - Repository URL: `https://github.com/YOUR_USERNAME/kubernetes-apps.git`
   - **Target Revision**: `deploy` (important - this is where configured manifests are)
   - Path: `applications/homepage/manifests`
   - Cluster URL: `https://kubernetes.default.svc`
   - Namespace: `homepage`
   - Sync Policy: Enable `Auto-Create Namespace`, `Auto-Sync`, `Self-Heal`, and `Prune`

**Note**: The application is configured to sync from the `deploy` branch, where the GitHub Actions workflow commits the configured manifests with your actual domain and settings.

3. **Verify Deployment**:
```bash
# Check application status
kubectl get application homepage -n argocd

# Check pods
kubectl get pods -n homepage

# Check ingress
kubectl get ingress -n homepage
```

4. **Access the Application**:
   - Web UI: `https://homepage.YOUR_DOMAIN`
   - The exact URL depends on your domain configuration

### Webhook Configuration

For automatic syncing when changes are pushed:

1. **In your Git provider**: Go to your repository settings
2. **Add Webhook**:
   - **Target URL**: `http://argocd-server.argocd.svc.cluster.local/api/webhooks/homepage`
   - **HTTP Method**: `POST`
   - **Content Type**: `application/json`
   - **Trigger On**: Push events
3. **Save**: Click "Add Webhook"

## 🎨 Features

- **Service Discovery**: Automatically discovers services via Kubernetes Ingress annotations
- **Kubernetes Widget**: Shows cluster metrics (CPU, memory, pod count)
- **Customizable Layout**: Organize services into groups
- **Theme Support**: Dark and light themes
- **Weather Widget**: Location-based weather information
- **Clock Widget**: Time display with timezone support

## 🔧 Configuration

### Service Discovery

Homepage automatically discovers services through Ingress annotations. Add these annotations to your Ingress resources:

```yaml
annotations:
  gethomepage.dev/enabled: "true"
  gethomepage.dev/name: "Service Name"
  gethomepage.dev/description: "Service description"
  gethomepage.dev/group: "Group Name"
  gethomepage.dev/icon: "icon-name.png"
```

### Manual Service Configuration

Services can also be manually configured in the `configmap.yaml` file under the `services.yaml` section.

### Kubernetes Metrics

The Kubernetes widget requires:
- Metrics Server installed in your cluster
- RBAC permissions (configured in `clusterrole.yaml`)
- Metrics API access

## 🐛 Troubleshooting

### Application Not Appearing in ArgoCD

**Check Application Status**:
```bash
kubectl get application homepage -n argocd
kubectl describe application homepage -n argocd
```

**Common Issues**:
- Repository URL incorrect: Check `application.yaml` `repoURL` matches your Git repository
- Path incorrect: Verify `path: applications/homepage/manifests` exists
- Repository not accessible: Check ArgoCD repository credentials

### Pods Not Starting

**Check Pod Status**:
```bash
kubectl get pods -n homepage
kubectl describe pod <pod-name> -n homepage
kubectl logs -n homepage -l app=homepage --tail=50
```

### Kubernetes Widget Not Showing Metrics

**Check Metrics Server**:
```bash
# Verify metrics server is running
kubectl get pods -n kube-system | grep metrics-server

# Check Homepage service account permissions
kubectl describe clusterrolebinding homepage -n homepage

# Test metrics API access
kubectl top nodes
kubectl top pods -n homepage
```

**Common Issues**:
- Metrics Server not installed: Install metrics server in your cluster
- RBAC permissions missing: Verify `clusterrole.yaml` includes metrics API permissions
- Metrics Server TLS issues: Check metrics server logs for TLS errors

### Service Discovery Not Working

**Check Ingress Annotations**:
```bash
# List all ingresses with Homepage annotations
kubectl get ingress -A -o yaml | grep gethomepage

# Check specific ingress
kubectl get ingress <ingress-name> -n <namespace> -o yaml | grep gethomepage
```

**Common Issues**:
- Missing annotations: Add required `gethomepage.dev/*` annotations to Ingress
- Ingress not in watched namespaces: Check Homepage configuration for namespace filters
- Labels mismatch: Ensure Ingress labels match for health checks

### Ingress Not Accessible

**Check Ingress**:
```bash
# Verify ingress configuration
kubectl get ingress -n homepage
kubectl describe ingress homepage -n homepage

# Check ingress controller logs
kubectl logs -n kube-system -l app.kubernetes.io/name=cilium
```

**Common Issues**:
- DNS not configured: Ensure DNS records point to your cluster's ingress IP
- Ingress controller not installed: Verify Cilium (or your ingress controller) is running
- TLS certificate issues: Check certificate status if using TLS

### Configuration Not Updating

**Check ConfigMap**:
```bash
# View current configmap
kubectl get configmap homepage -n homepage -o yaml

# Check if pod has restarted
kubectl get pods -n homepage
```

**Common Issues**:
- ConfigMap not updated: Run `./configure.sh` from repository root
- Pod not restarted: Restart the deployment: `kubectl rollout restart deployment/homepage -n homepage`
- ArgoCD not syncing: Check ArgoCD sync status

## 🔄 Updating Configuration

1. **Edit Configuration**:
   - Edit `manifests/configmap.yaml` directly, or
   - Update values in `config` file and run `./configure.sh`

2. **Apply Changes**:
```bash
# From repository root
./configure.sh  # If using config file
git add applications/homepage/manifests/configmap.yaml
git commit -m "chore: update homepage configuration"
git push origin main
```

3. **Restart Pod** (if needed):
```bash
kubectl rollout restart deployment/homepage -n homepage
```

## 📚 Additional Resources

- [Homepage Documentation](https://gethomepage.dev/)
- [Homepage GitHub](https://github.com/gethomepage/homepage)
- [ArgoCD Documentation](https://argo-cd.readthedocs.io/)
- [Kubernetes Ingress Documentation](https://kubernetes.io/docs/concepts/services-networking/ingress/)

## 📄 License

This configuration is provided as-is for educational and personal use.

