# Kubernetes Applications

GitOps repository for Kubernetes applications managed by ArgoCD.

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

## 🔧 Configuration

### 1. Configure Your Environment

```bash
# Run the configuration script to create your config file
./configure.sh

# Edit the generated config file with your values
nano config
```

**Required Configuration:**
- `DOMAIN`: Your domain name (e.g., example.com)
- `LOCATION`: Your city name
- `LATITUDE`: Your latitude
- `LONGITUDE`: Your longitude
- `TIMEZONE`: Your timezone

### 2. Apply Configuration

```bash
# Run the script again to apply your configuration
./configure.sh
```

**Note:** The `config` file is automatically excluded from Git commits to protect your personal information.

## 🚀 ArgoCD Setup

### Using ArgoCD GUI

1. **Access ArgoCD UI**: Navigate to your ArgoCD server URL
2. **Login**: Use admin credentials
3. **Create Application**: Click "New App" button
4. **Configure Application**:
   - **Application Name**: `homepage`
   - **Project**: `default`
   - **Sync Policy**: `Automatic`
   - **Repository URL**: `https://github.com/YOUR_USERNAME/kubernetes-apps.git`
   - **Path**: `applications/homepage/manifests`
   - **Cluster URL**: `https://kubernetes.default.svc`
   - **Namespace**: `homepage`
5. **Create**: Click "Create" button
6. **Sync**: Click "Sync" button to deploy

### Application Configuration

- **Homepage**: Dashboard application in `homepage` namespace
- **Monitoring**: Prometheus, Grafana stack in `monitoring` namespace  
- **Ingress**: Nginx ingress controller in `ingress-nginx` namespace
- **Secrets**: Secret management in `secrets` namespace

### Configuration

Update the following files with your specific configuration:
- **Domain names**: Update ingress.yaml files with your domain
- **Coordinates**: Update configmap.yaml with your location
- **Service URLs**: Update service endpoints in configmap.yaml

---

This repository provides a clean GitOps structure for ArgoCD deployment.