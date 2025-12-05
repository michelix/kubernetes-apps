# Debian 13 + kubeadm + Flux Setup Guide

This guide sets up a production-ready Kubernetes cluster on Debian 13 using kubeadm (standard Kubernetes) and Flux (GitOps).

## Prerequisites

- Debian 13 server
- 4 VCPU cores
- 8 GB RAM minimum
- 80 GB disk space
- Root/sudo access
- Kernel modules support (br_netfilter, overlay)

## Hardware Requirements

With **4 VCPU, 8GB RAM, 80GB disk**, you have sufficient resources for:
- Full Kubernetes control plane (~1.5-2GB RAM)
- Multiple worker nodes (if needed)
- Application workloads
- Flux GitOps controller
- Ingress controller
- Monitoring (optional)

## Step 1: Setup Sudo and Create Non-Root User (Best Practice)

**Important**: While Kubernetes components run as root (required for system operations), you should use a non-root user for day-to-day operations.

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

# Switch to the new user (as root, no password needed)
su - k8s-user
# After this command, you'll be in /home/k8s-user (the user's home directory)
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

## Step 2: Configure System Prerequisites

kubeadm requires certain kernel modules, system configurations, and packages.

**Who runs what in this step?**
- **Commands below**: should be run **as `k8s-user`**, using `sudo` only where explicitly written

```bash
# Install required packages
sudo apt-get update
sudo apt-get install -y apt-transport-https ca-certificates curl gpg conntrack socat ipset ipvsadm

# Load required kernel modules
sudo modprobe overlay
sudo modprobe br_netfilter

# Make modules persistent across reboots
cat <<EOF | sudo tee /etc/modules-load.d/k8s.conf
overlay
br_netfilter
EOF

# Configure sysctl parameters
cat <<EOF | sudo tee /etc/sysctl.d/k8s.conf
net.bridge.bridge-nf-call-iptables  = 1
net.bridge.bridge-nf-call-ip6tables = 1
net.ipv4.ip_forward                 = 1
EOF

# Apply sysctl settings
sudo sysctl --system

# Disable swap (Kubernetes requires swap to be disabled)
sudo swapoff -a
sudo sed -i '/ swap / s/^\(.*\)$/#\1/g' /etc/fstab

# Verify swap is disabled
free -h  # Should show Swap: 0B

# Verify conntrack is installed
conntrack --version
```

## Step 3: Install Container Runtime (containerd)

kubeadm requires a container runtime. We'll use containerd (recommended by Kubernetes).

**User context:**
- Run all of these commands as **`k8s-user`**
- Use `sudo` where explicitly written

```bash
# Install containerd
sudo apt-get update
sudo apt-get install -y ca-certificates curl gpg

# Add Docker's official GPG key
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/debian/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Add Docker repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install containerd
sudo apt-get update
sudo apt-get install -y containerd.io

# Configure containerd
sudo mkdir -p /etc/containerd
containerd config default | sudo tee /etc/containerd/config.toml >/dev/null 2>&1

# Enable systemd cgroup driver (required for kubeadm)
sudo sed -i 's/SystemdCgroup = false/SystemdCgroup = true/' /etc/containerd/config.toml

# Start and enable containerd
sudo systemctl restart containerd
sudo systemctl enable containerd

# Verify containerd is running
sudo systemctl status containerd
```

## Step 4: Install kubeadm, kubelet, and kubectl

Install the Kubernetes command-line tools and cluster management tool.

**User context:**
- Run all of these commands as **`k8s-user`**
- Use `sudo` where explicitly written

```bash
# Add Kubernetes repository
sudo apt-get install -y apt-transport-https ca-certificates curl gpg
curl -fsSL https://pkgs.k8s.io/core:/stable:/v1.31/deb/Release.key | sudo gpg --dearmor -o /etc/apt/keyrings/kubernetes-apt-keyring.gpg
echo 'deb [signed-by=/etc/apt/keyrings/kubernetes-apt-keyring.gpg] https://pkgs.k8s.io/core:/stable:/v1.31/deb/ /' | sudo tee /etc/apt/sources.list.d/kubernetes.list

# Install kubeadm, kubelet, and kubectl
sudo apt-get update
sudo apt-get install -y kubelet kubeadm kubectl
sudo apt-mark hold kubelet kubeadm kubectl

# Verify installation
kubectl version --client
kubeadm version
```

## Step 5: Initialize Kubernetes Cluster

Initialize the control plane node.

**User context:**
- Run all of these commands as **`k8s-user`**
- The `kubeadm init` command needs `sudo` (it configures system services)

```bash
# Initialize the cluster (this will take a few minutes)
sudo kubeadm init --pod-network-cidr=10.244.0.0/16

# After initialization completes, you'll see output with:
# - kubeadm join command (save this for adding worker nodes)
# - Instructions to set up kubeconfig

# Set up kubeconfig for k8s-user (as k8s-user, no sudo)
mkdir -p $HOME/.kube
sudo cp -i /etc/kubernetes/admin.conf $HOME/.kube/config
sudo chown $(id -u):$(id -g) $HOME/.kube/config

# Make kubeconfig secure
chmod 600 $HOME/.kube/config

# Verify kubectl works
kubectl cluster-info
kubectl get nodes
```

**Note**: The node will show as `NotReady` until you install a CNI (Container Network Interface) plugin in the next step.

## Step 6: Install CNI Plugin (Flannel)

Install Flannel as the network plugin for pod networking.

**User context:**
- Run all of these commands as **`k8s-user`**
- No `sudo` needed (uses kubectl which accesses cluster via kubeconfig)

```bash
# Install Flannel CNI
kubectl apply -f https://github.com/flannel-io/flannel/releases/latest/download/kube-flannel.yml

# Wait for Flannel pods to be ready
kubectl get pods -n kube-flannel --watch

# Once ready, verify the node is Ready
kubectl get nodes
```

**Resource Usage**: Flannel uses ~50-100Mi RAM.

## Step 7: Remove Control Plane Taint (Single-Node Setup)

By default, the control plane node has a taint that prevents regular pods from scheduling. For a single-node cluster, remove this taint.

```bash
# Remove the taint to allow pods on control plane
kubectl taint nodes --all node-role.kubernetes.io/control-plane-

# Verify the taint is removed
kubectl describe node | grep Taints
```

## Step 8: Install Flux

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

## Step 9: Configure Flux Git Source

Update the Git repository URL in `applications/terminal/flux-setup.yaml`:

```yaml
spec:
  url: https://github.com/YOUR_USERNAME/kubernetes-apps.git
  ref:
    branch: debian13-kubeadm-flux
```

Then apply the Flux configuration:

```bash
# Apply Flux Git source and Kustomization
kubectl apply -f applications/terminal/flux-setup.yaml

# Check Flux status
flux get sources git
flux get kustomizations
```

## Step 10: Update Manifests for kubeadm

Before Flux can deploy, update these files:

### 1. Update Ingress Host

Edit `applications/terminal/manifests-kubeadm/ingress.yaml`:
- Change `terminal.yourdomain.com` to your actual domain or VM IP

### 2. Update Image Registry

Edit deployment files:
- `backend-deployment.yaml`: Update `YOUR_REGISTRY/terminal-backend:latest`
- `frontend-deployment.yaml`: Update `YOUR_REGISTRY/terminal-frontend:latest`

### 3. Update Storage Class (if needed)

kubeadm doesn't include a default storage provisioner. You'll need to install one:

```bash
# Install local-path-provisioner (simple, works for single-node)
kubectl apply -f https://raw.githubusercontent.com/rancher/local-path-provisioner/v0.0.24/deploy/local-path-storage.yaml

# Set as default storage class
kubectl patch storageclass local-path -p '{"metadata": {"annotations":{"storageclass.kubernetes.io/is-default-class":"true"}}}'
```

Or use the manifests with `local-path` storage class.

### 4. Install Ingress Controller

kubeadm doesn't include an ingress controller. Install one:

```bash
# Install NGINX Ingress Controller
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.11.1/deploy/static/provider/cloud/deploy.yaml

# Wait for ingress controller to be ready
kubectl get pods -n ingress-nginx --watch
```

### 5. Commit Changes

```bash
git add .
git commit -m "feat: configure kubeadm manifests for Debian 13 deployment"
git push origin debian13-kubeadm-flux
```

## Step 11: Monitor Deployment

Flux will automatically sync from Git:

```bash
# Watch Flux sync
flux get kustomizations terminal-app --watch

# Check application pods
kubectl get pods -n terminal -w

# Check Flux logs
kubectl logs -n flux-system -l app=kustomize-controller --tail=50
```

## Step 12: Access the Application

```bash
# Check ingress
kubectl get ingress -n terminal

# Get the external IP (if using LoadBalancer) or use NodePort
kubectl get svc -n ingress-nginx ingress-nginx-controller

# For NodePort access, use:
# http://YOUR_VM_IP:$(kubectl get svc -n ingress-nginx ingress-nginx-controller -o jsonpath='{.spec.ports[?(@.port==80)].nodePort}')/terminal
```

## Resource Usage

Expected memory usage on 8GB server:

```
Kubernetes control plane:  ~1.5-2GB
Flannel CNI:               ~100Mi
NGINX Ingress:             ~200Mi
Terminal app:              ~450Mi
Flux:                      ~250Mi
System overhead:           ~500Mi
--------------------------------
Total:                     ~3GB
Remaining:                 ~5GB headroom ✅ (plenty of room)
```

## Security Best Practices

### User Management
- ✅ **Kubernetes services**: Run as root (required for system operations)
- ✅ **Your operations**: Use non-root user for all kubectl/flux commands
- ✅ **Kubeconfig**: Owned by your user with 600 permissions
- ✅ **Sudo access**: Only when needed for system-level tasks

### How Users and Services Interact

**What runs as root:**
- **systemd services**: `kubelet`, `containerd` run as root via systemd
- **Kubernetes components**: Control plane pods (kube-apiserver, etcd, kube-controller-manager, kube-scheduler) run in containers but are managed by root-owned systemd services
- **Package installations**: Installing kubeadm/kubelet requires root

**What runs as `k8s-user`:**
- **kubectl**: CLI tool that talks to the API server (uses kubeconfig in `~/.kube/config`)
- **kubeadm**: Cluster management commands (requires sudo for init/join)
- **flux CLI**: GitOps operations (requires sudo only for installation)
- **Your daily operations**: All `kubectl` and `flux` commands run as `k8s-user`

**Why we don't run everything as root:**
1. **Principle of least privilege**: Only use root when absolutely necessary
2. **Security isolation**: If `k8s-user` is compromised, attacker can't directly modify system services
3. **Audit trail**: Easier to track who did what (sudo logs vs root commands)
4. **Accident prevention**: Reduces risk of accidentally breaking system services
5. **Best practice**: Industry standard for production Kubernetes deployments

### File Permissions
```bash
# Ensure kubeconfig is secure
chmod 600 ~/.kube/config
chown $USER:$USER ~/.kube/config
```

### Service Management
```bash
# Kubernetes service management (requires root/sudo)
sudo systemctl status kubelet
sudo systemctl restart kubelet
sudo journalctl -u kubelet -f
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

### Check Kubernetes Services
```bash
sudo systemctl status kubelet
sudo systemctl status containerd
sudo journalctl -u kubelet -f
```

### Check Cluster Status
```bash
kubectl get nodes
kubectl cluster-info
kubectl get pods --all-namespaces
```

### Check CNI Status
```bash
kubectl get pods -n kube-flannel
kubectl logs -n kube-flannel -l app=flannel
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

### Reset Cluster (if needed)
```bash
# WARNING: This will destroy your cluster
sudo kubeadm reset
sudo rm -rf /etc/cni/net.d
sudo rm -rf /var/lib/etcd
sudo rm -rf ~/.kube
```

## Manual Deployment (Alternative)

If you prefer manual deployment instead of Flux:

```bash
kubectl apply -f applications/terminal/manifests-kubeadm/namespace.yaml
kubectl apply -f applications/terminal/manifests-kubeadm/postgres-secret.yaml
kubectl apply -f applications/terminal/manifests-kubeadm/postgres-configmap.yaml
kubectl apply -f applications/terminal/manifests-kubeadm/postgres-pvc.yaml
kubectl apply -f applications/terminal/manifests-kubeadm/postgres-deployment.yaml
kubectl apply -f applications/terminal/manifests-kubeadm/postgres-service.yaml
kubectl apply -f applications/terminal/manifests-kubeadm/backend-deployment.yaml
kubectl apply -f applications/terminal/manifests-kubeadm/backend-service.yaml
kubectl apply -f applications/terminal/manifests-kubeadm/frontend-deployment.yaml
kubectl apply -f applications/terminal/manifests-kubeadm/frontend-service.yaml
kubectl apply -f applications/terminal/manifests-kubeadm/ingress.yaml
```

## Differences from k3d Setup

1. **Installation**: Full Kubernetes (kubeadm) vs K3s in Docker
2. **Storage**: Need to install storage provisioner (local-path-provisioner) vs built-in
3. **Ingress**: Need to install ingress controller (NGINX) vs built-in Traefik
4. **Resources**: More overhead (~1.5-2GB) but more production-ready
5. **Complexity**: More setup steps but standard Kubernetes API

## Advantages of kubeadm

✅ **Production-ready**: Standard Kubernetes, widely used in production
✅ **Full control**: Complete control over all components
✅ **Standard API**: 100% compatible with upstream Kubernetes
✅ **Scalable**: Easy to add worker nodes later
✅ **Flexible**: Can customize any component
✅ **Industry standard**: Most common way to install Kubernetes

## Important Notes

⚠️ **Single-node limitations**:
- Not highly available (single control plane)
- Suitable for development/staging or small production workloads
- For production HA, add multiple control plane nodes

⚠️ **Maintenance**:
- Regular updates required for security patches
- Backup etcd data before upgrades
- Plan for maintenance windows

✅ **For Production**:
With 8GB RAM and 4 CPUs, you have sufficient resources for:
- Multiple applications
- Monitoring stack (Prometheus, Grafana)
- Log aggregation
- CI/CD workloads

