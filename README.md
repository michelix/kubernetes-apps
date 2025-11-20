# Kubernetes Applications

GitOps repository for Kubernetes applications managed by ArgoCD.

## 📁 Repository Structure

```
applications/
├── homepage/                    # Homepage dashboard application
│   ├── application.yaml        # ArgoCD Application definition
│   ├── README.md              # Homepage-specific documentation
│   └── manifests/              # Kubernetes manifests
├── terminal/                    # Terminal web application
│   ├── application.yaml        # ArgoCD Application definition
│   ├── README.md              # Terminal-specific documentation
│   ├── CI_CD_SETUP.md         # CI/CD setup guide
│   ├── build.sh               # Build script
│   ├── frontend/               # Next.js frontend
│   ├── backend/                # FastAPI backend
│   └── manifests/              # Kubernetes manifests
├── monitoring/                  # Monitoring stack (placeholder)
│   ├── application.yaml
│   └── manifests/
├── ingress/                     # Ingress controller (placeholder)
│   ├── application.yaml
│   └── manifests/
└── secrets/                     # Secret management (placeholder)
    ├── application.yaml
    └── manifests/
```

## 🔧 Configuration

This repository uses placeholders (`YOUR_REGISTRY`, `YOUR_DOMAIN`, `YOUR_USERNAME`) to keep personal information out of the public repository.

### Initial Setup

1. **Configure Your Environment**:
```bash
# Run the configuration script to create your config file
./configure.sh

# Edit the generated config file with your values
nano config
```

**Required Configuration Values:**
- `DOMAIN`: Your domain name (e.g., `example.com`)
- `DOCKER_REGISTRY`: Your Docker registry (e.g., `docker.io/username` or `ghcr.io/username`)
- `GITHUB_USERNAME`: Your GitHub username
- `LOCATION`, `LATITUDE`, `LONGITUDE`, `TIMEZONE`: For Homepage weather widget (optional)

2. **Apply Configuration**:
```bash
# Run the script again to apply your configuration
./configure.sh
```

This script will:
- Replace `YOUR_REGISTRY` with your Docker registry in deployment manifests
- Replace `YOUR_DOMAIN` with your domain in ingress manifests
- Replace `YOUR_USERNAME` with your GitHub username in application.yaml files
- Update application-specific configurations

**Important GitOps Workflow:**
- The manifests in this repository contain placeholders to keep personal information out of the public repository
- **Automated Configuration**: Some applications (homepage, terminal) use GitHub Actions workflows that automatically configure manifests and commit them to a `deploy` branch
- **Required GitHub Secrets**: Configure the following secrets in your repository:
  - `DOMAIN`: Your domain name (required for homepage)
  - `GITHUB_USERNAME`: Your GitHub username (required)
  - `DOCKERHUB_USERNAME`: Docker Hub login (required for terminal)
  - `DOCKER_REGISTRY_PATH`: Docker Hub registry path (required for terminal)
  - `DOCKERHUB_TOKEN`: Docker Hub access token (required for terminal)
  - `LOCATION`, `LATITUDE`, `LONGITUDE`, `TIMEZONE`: Optional, for homepage weather widget
- **Manual Configuration**: For applications without automated workflows, run `./configure.sh` locally and commit to your own branch/fork

**Note:** The `config` file is automatically excluded from Git commits (via `.gitignore`) to protect your personal information.

## 🚀 Getting Started

### Prerequisites

- Kubernetes cluster
- ArgoCD installed and configured
- Git repository access
- Container registry access (for applications that require it)

### Deploying Applications

Each application has its own ArgoCD Application definition in `applications/<app-name>/application.yaml`.

#### Option 1: Using kubectl (Recommended)

```bash
# Deploy a specific application
kubectl apply -f applications/<app-name>/application.yaml

# Example: Deploy homepage
kubectl apply -f applications/homepage/application.yaml
```

#### Option 2: Using ArgoCD UI

1. **Access ArgoCD UI**: Navigate to your ArgoCD server URL
2. **Login**: Use admin credentials
3. **Create Application**: Click "New App" button
4. **Configure Application**:
   - **Application Name**: `<app-name>`
   - **Project**: `default`
   - **Sync Policy**: `Automatic` (with Self-Heal and Prune enabled)
   - **Repository URL**: `https://github.com/YOUR_USERNAME/kubernetes-apps.git`
   - **Path**: `applications/<app-name>/manifests`
   - **Cluster URL**: `https://kubernetes.default.svc`
   - **Namespace**: `<app-name>`
5. **Create**: Click "Create" button
6. **Sync**: Click "Sync" button to deploy (or enable auto-sync)

### Webhook Configuration

For automatic syncing when changes are pushed to the repository:

1. **In your Git provider** (GitHub, Gitea, etc.): Go to your repository settings
2. **Add Webhook**:
   - **Target URL**: `http://argocd-server.argocd.svc.cluster.local/api/webhooks/<app-name>`
   - **HTTP Method**: `POST`
   - **Content Type**: `application/json`
   - **Trigger On**: Push events
3. **Save**: Click "Add Webhook"

**Note**: Replace `<app-name>` with the actual application name (e.g., `homepage`, `terminal`).

## 📚 Application Documentation

Each application has its own documentation:

- **[Homepage](./applications/homepage/README.md)** - Dashboard application with service discovery
- **[Terminal](./applications/terminal/README.md)** - Web-based terminal emulator

## 🔄 GitOps Workflow

1. **Make Changes**: Edit manifests or application code
2. **Commit**: Commit changes to your Git repository
3. **Push**: Push to the repository
4. **ArgoCD Sync**: ArgoCD detects changes and syncs automatically (if auto-sync enabled)
5. **Deploy**: Applications are deployed to your Kubernetes cluster

### Branch Strategy

- **`main` branch**: Contains source code and manifests
- **`deploy` branch**: (Optional) Used by CI/CD workflows for automated manifest updates

## 🛠️ Development

### Building Docker Images

Some applications include build scripts. See individual application documentation for details.

Example:
```bash
cd applications/terminal
./build.sh
```

### Local Testing

Before deploying to Kubernetes:
1. Test application code locally
2. Build and test Docker images
3. Verify manifests are correct
4. Commit and push changes

## 📝 Adding New Applications

1. Create a new directory under `applications/`
2. Add Kubernetes manifests in `manifests/` subdirectory
3. Create `application.yaml` for ArgoCD
4. Add application-specific documentation in `README.md`
5. Update `configure.sh` if the application needs configuration
6. Commit and push

## 🔒 Security Best Practices

- Never commit secrets or personal information
- Use Kubernetes Secrets for sensitive data
- Use Sealed Secrets or External Secrets Operator for secret management
- Keep the `config` file in `.gitignore`
- Regularly rotate access tokens and credentials

## 📚 Additional Resources

- [ArgoCD Documentation](https://argo-cd.readthedocs.io/)
- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [GitOps Principles](https://www.gitops.tech/)

---

This repository provides a clean GitOps structure for ArgoCD deployment.
