# Debian 12 + k3d + Flux Setup Guide

This guide sets up a lightweight Kubernetes cluster on Debian 12 using k3d (K3s in Docker) and Flux (lightweight GitOps).

## Prerequisites

- Debian 12 server
- 2GB RAM minimum
- 2 CPU cores
- 20GB+ disk space
- Root/sudo access
- Docker support (required for k3d)

## Step 1: Setup Sudo and Create Non-Root User (Best Practice)

**Important**: While Docker and k3d run as root (required for system operations), you should use a non-root user for day-to-day operations.

```bash
# Create a dedicated user for Kubernetes operations (if not already exists)
useradd -m -s /bin/bash k8s-user

# Add user to sudo group
usermod -aG sudo k8s-user

# Set a password for k8s-user (needed for sudo commands later)
passwd k8s-user
# Enter the password when prompted

# Verify sudo group exists and user is added
groups k8s-user  # Should show: "k8s-user : k8s-user sudo"
# This means: username (k8s-user) is in groups: k8s-user (primary) and sudo (secondary)

# Switch to the new user (as root, no password needed)
su - k8s-user
# After this command, you'll be in /home/k8s-user (the user's home directory)
# Note: When switching from root, no password is required
```

**Password Notes**:
- When running `su - k8s-user` **as root**: No password needed
- When the k8s-user uses `sudo` commands: They'll need to enter **their own password** (the one set with `passwd k8s-user`)
- If you want passwordless sudo (less secure but convenient):

```bash
# As root, add passwordless sudo for k8s-user (optional)
echo "k8s-user ALL=(ALL) NOPASSWD: ALL" >> /etc/sudoers.d/k8s-user
chmod 0440 /etc/sudoers.d/k8s-user
```

**Working Directory**: After `su - k8s-user`, your current directory will be `/home/k8s-user`.

## Step 2: Install Docker

k3d requires Docker to run K3s in containers.

**Who runs what in this step?**
- **Docker service (`dockerd`)**: runs as **root**, managed by **systemd**
- **Commands below**: should be run **as `k8s-user`**, using `sudo` only where explicitly written

```bash
# Install Docker (as k8s-user, using sudo)
sudo apt-get update
sudo apt-get install -y docker.io

# Start and enable Docker service (still as k8s-user with sudo)
sudo systemctl start docker
sudo systemctl enable docker

# Add k8s-user to docker group (so docker CLI works without sudo)
sudo usermod -aG docker k8s-user

# Apply group changes (or logout/login)
newgrp docker

# Verify Docker works (now without sudo, as k8s-user)
docker run hello-world
```

**Note**: If Docker fails to run containers, your VPS provider may not support containers at all, and you'll need to switch providers.

## Step 3: Install kubectl

kubectl is the command-line tool for interacting with Kubernetes clusters. Install it before creating the k3d cluster.

**User context:**
- Run all of these commands as **`k8s-user`**
- The **install** line needs `sudo` (because it writes to `/usr/local/bin`)

```bash
# Install kubectl (as k8s-user, needs sudo)
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl
rm kubectl

# Verify installation (no sudo)
kubectl version --client
```

## Step 4: Install k3d

k3d runs K3s inside Docker containers, making it work even when native K3s can't due to kernel module issues.

**User context:**
- Run all of these commands as **`k8s-user`**
- Only the **install** line needs `sudo` (because it writes to `/usr/local/bin`)

```bash
# Install k3d (as k8s-user, needs sudo)
sudo curl -s https://raw.githubusercontent.com/k3d-io/k3d/main/install.sh | bash

# Verify installation (no sudo)
k3d version

# Create a k3d cluster (no sudo, uses docker group + Docker root daemon)
k3d cluster create terminal-cluster

# Note: kubectl may not work yet - see Step 5 for kubeconfig setup
# You can verify the cluster was created with:
k3d cluster list
```

**Resource Usage**: k3d uses ~400-500Mi RAM (Docker + K3s in containers).

## Step 5: Set Up kubectl Access

k3d creates a kubeconfig file, but you need to ensure it's properly configured and exported.

```bash
# k3d automatically merges kubeconfig into ~/.kube/config
# But you may need to explicitly export it for the current session
export KUBECONFIG=~/.kube/config

# Or get the kubeconfig from k3d explicitly
k3d kubeconfig merge terminal-cluster --kubeconfig-merge-default

# Verify the kubeconfig exists
ls -la ~/.kube/config

# Make sure it's secure
chmod 600 ~/.kube/config

# Verify kubectl can access the cluster
kubectl cluster-info
kubectl get nodes
```

**Note**: To make the KUBECONFIG export persistent across sessions, add it to your shell profile:

```bash
# Add to ~/.bashrc or ~/.zshrc (depending on your shell)
echo 'export KUBECONFIG=~/.kube/config' >> ~/.bashrc
source ~/.bashrc
```

## Step 6: Install Flux

Flux is a lightweight GitOps tool (~200-300Mi RAM vs ArgoCD's 500-600Mi).

**Run as your non-root user** (Flux CLI and operations don't need root):

```bash
# Install Flux CLI (requires sudo for system-wide installation)
curl -s https://fluxcd.io/install.sh | sudo bash

# Install Flux on the cluster (as non-root user)
flux install

# Verify Flux installation
kubectl get pods -n flux-system
```

## Step 7: Configure Flux Git Source

Update the Git repository URL in `applications/terminal/flux-setup.yaml`:

```yaml
spec:
  url: https://github.com/YOUR_USERNAME/kubernetes-apps.git
  ref:
    branch: debian12-k3s-flux
```

Then apply the Flux configuration:

```bash
# Apply Flux Git source and Kustomization
kubectl apply -f applications/terminal/flux-setup.yaml

# Check Flux status
flux get sources git
flux get kustomizations
```

## Step 8: Update Manifests for k3d

Before Flux can deploy, update these files:

### 1. Update Ingress Host

Edit `applications/terminal/manifests-k3s/ingress.yaml`:
- Change `terminal.yourdomain.com` to your actual domain or VM IP

### 2. Update Image Registry

Edit deployment files:
- `backend-deployment.yaml`: Update `YOUR_REGISTRY/terminal-backend:latest`
- `frontend-deployment.yaml`: Update `YOUR_REGISTRY/terminal-frontend:latest`

### 3. Update Storage Class (if needed)

k3d uses `local-path` storage by default (same as K3s), so the manifests should work as-is.

### 4. Commit Changes

```bash
git add .
git commit -m "feat: configure k3d manifests for Debian 12 deployment"
git push origin debian12-k3s-flux
```

## Step 9: Monitor Deployment

Flux will automatically sync from Git:

```bash
# Watch Flux sync
flux get kustomizations terminal-app --watch

# Check application pods
kubectl get pods -n terminal -w

# Check Flux logs
kubectl logs -n flux-system -l app=kustomize-controller --tail=50
```

## Step 10: Access the Application

```bash
# Check ingress
kubectl get ingress -n terminal

# For k3d, you may need to use port-forward or configure ingress
# k3d includes Traefik by default, but you may need to expose ports
k3d cluster list
```

## Resource Usage

Expected memory usage on 2GB server:

```
Docker:              ~150Mi
k3d (K3s in Docker): ~400Mi
Terminal app:        ~450Mi (optimized)
Flux:                ~250Mi
System overhead:     ~200Mi
--------------------------------
Total:               ~1.45GB
Remaining:           ~550Mi headroom ⚠️ (tight but workable)
```

## Security Best Practices

### How Users and Services Interact

To understand the isolation model:

- **root**
  - Owns and runs **system services** like `dockerd` (Docker daemon) via `systemd`
  - Owns files under `/var/lib/docker`, `/usr/local/bin`, etc.
  - Only needed for:
    - installing packages (`apt-get install ...`)
    - managing services (`systemctl start/stop ...`)
    - installing system-wide tools (k3d, Flux CLI)

- **`k8s-user` (non-root)**
  - Your **daily driver** for:
    - `docker` CLI (through membership in the `docker` group)
    - `k3d` CLI (creating/deleting clusters)
    - `kubectl` (managing Kubernetes resources)
    - `flux` CLI (GitOps operations)
  - Uses `sudo` **only** when something truly needs root (install, system changes)

- **Containers / K3s inside k3d**
  - k3d starts **Docker containers** that run K3s components and your workloads
  - These processes are isolated inside containers, with cgroups/namespaces managed by the **root Docker daemon**

**Why not run everything as root?**
- Reduces blast radius if a command or script goes wrong
- Commands like `kubectl apply` or `flux install` do **not** need root—they talk to the cluster API, not the host OS
- Using `k8s-user` keeps:
  - system-level changes explicit (guarded by `sudo`)
  - kubeconfig and GitOps operations clearly separated from OS administration

### User Management
- ✅ **Docker service**: Runs as root (required for system operations)
- ✅ **Your operations**: Use non-root user (`k8s-user`) for all `docker`/`k3d`/`kubectl`/`flux` commands
- ✅ **Kubeconfig**: Owned by your user with 600 permissions
- ✅ **Sudo access**: Only when needed for system-level tasks

### File Permissions
```bash
# Ensure kubeconfig is secure
chmod 600 ~/.kube/config
chown $USER:$USER ~/.kube/config
```

### Service Management
```bash
# Docker service management (requires root/sudo)
sudo systemctl status docker
sudo systemctl restart docker
sudo journalctl -u docker -f
```

### Daily Operations
All kubectl and flux commands should be run as your non-root user:
```bash
# As non-root user
kubectl get pods
flux get kustomizations
kubectl apply -f manifests/
```

## Troubleshooting

### Check Docker Status
```bash
sudo systemctl status docker
sudo journalctl -u docker -f
docker ps
```

### Check k3d Cluster Status
```bash
k3d cluster list
k3d cluster get terminal-cluster
kubectl get nodes
```

### Check Flux Status
```bash
flux get sources git
flux get kustomizations
kubectl get pods -n flux-system
```

### Check Application Status
```bash
kubectl get pods -n terminal
kubectl describe pod <pod-name> -n terminal
kubectl logs <pod-name> -n terminal
```

### Force Flux Sync
```bash
flux reconcile kustomization terminal-app
```

### k3d Cluster Management
```bash
# List clusters
k3d cluster list

# Stop cluster
k3d cluster stop terminal-cluster

# Start cluster
k3d cluster start terminal-cluster

# Delete cluster
k3d cluster delete terminal-cluster

# Create cluster with custom config
k3d cluster create terminal-cluster --port "80:80@loadbalancer" --port "443:443@loadbalancer"
```

## Manual Deployment (Alternative)

If you prefer manual deployment instead of Flux:

```bash
kubectl apply -f applications/terminal/manifests-k3s/namespace.yaml
kubectl apply -f applications/terminal/manifests-k3s/postgres-secret.yaml
kubectl apply -f applications/terminal/manifests-k3s/postgres-configmap.yaml
kubectl apply -f applications/terminal/manifests-k3s/postgres-pvc.yaml
kubectl apply -f applications/terminal/manifests-k3s/postgres-deployment.yaml
kubectl apply -f applications/terminal/manifests-k3s/postgres-service.yaml
kubectl apply -f applications/terminal/manifests-k3s/backend-deployment.yaml
kubectl apply -f applications/terminal/manifests-k3s/backend-service.yaml
kubectl apply -f applications/terminal/manifests-k3s/frontend-deployment.yaml
kubectl apply -f applications/terminal/manifests-k3s/frontend-service.yaml
kubectl apply -f applications/terminal/manifests-k3s/ingress.yaml
```

## Differences from Main Manifests

1. **Storage**: `local-path` (k3d/K3s default) instead of `linstor-lvm-r1`
2. **Ingress**: `traefik` (k3d/K3s default) instead of `cilium`
3. **Resources**: Optimized for 2GB RAM (reduced requests)
4. **PostgreSQL**: Added memory optimization env vars

## Important Notes

⚠️ **k3d Limitations**:
- Adds Docker layer overhead (~150Mi)
- Not ideal for production (designed for development/testing)
- More complex than native k3s
- Storage persistence requires extra configuration
- Network setup can be trickier

⚠️ **For Production**:
Consider switching to a VPS provider that supports native Kubernetes (like Hetzner Cloud) for:
- Native k3s (lightest, ~250-300Mi)
- Production-ready setup
- Better performance
- Simpler maintenance

