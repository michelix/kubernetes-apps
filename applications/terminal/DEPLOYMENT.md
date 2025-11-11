# Deployment Checklist

Follow these steps to deploy the Terminal application to your Kubernetes cluster via ArgoCD.

## Prerequisites

- ✅ Kubernetes cluster running
- ✅ ArgoCD installed and configured
- ✅ Container registry access (Docker Hub, GHCR, etc.)
- ✅ GitHub repository access
- ✅ kubectl configured to access your cluster

## Step 1: Build and Push Docker Images

1. **Set your registry**:
   ```bash
   export DOCKER_REGISTRY=your-registry.io  # e.g., ghcr.io/username or docker.io/username
   ```

2. **Build images**:
   ```bash
   cd applications/terminal
   chmod +x build.sh
   ./build.sh
   ```

3. **Push images** (update the script or run manually):
   ```bash
   docker push ${DOCKER_REGISTRY}/terminal-frontend:latest
   docker push ${DOCKER_REGISTRY}/terminal-backend:latest
   ```

## Step 2: Update Kubernetes Manifests

1. **Update image references**:
   - Edit `manifests/frontend-deployment.yaml`: Replace `YOUR_REGISTRY` with your registry
   - Edit `manifests/backend-deployment.yaml`: Replace `YOUR_REGISTRY` with your registry

2. **Update domain in ingress**:
   - Edit `manifests/ingress.yaml`: Replace `terminal.YOUR_DOMAIN` with your actual domain (e.g., `terminal.example.com`)

3. **Update ArgoCD application**:
   - Edit `application.yaml`: Replace `YOUR_USERNAME` with your GitHub username

## Step 3: Push to GitHub

```bash
git add applications/terminal/
git commit -m "Add terminal web application"
git push origin main
```

## Step 4: Deploy with ArgoCD

### Option A: Using kubectl

```bash
kubectl apply -f applications/terminal/application.yaml
```

### Option B: Using ArgoCD UI

1. Open ArgoCD UI
2. Click "New App"
3. Fill in:
   - **Application Name**: `terminal`
   - **Project**: `default`
   - **Sync Policy**: `Automatic`
   - **Repository URL**: `https://github.com/YOUR_USERNAME/kubernetes-apps.git`
   - **Path**: `applications/terminal/manifests`
   - **Cluster URL**: `https://kubernetes.default.svc`
   - **Namespace**: `terminal`
4. Click "Create"
5. Click "Sync" (or wait for auto-sync)

## Step 5: Verify Deployment

1. **Check pods**:
   ```bash
   kubectl get pods -n terminal
   ```
   All pods should be in `Running` state.

2. **Check services**:
   ```bash
   kubectl get svc -n terminal
   ```

3. **Check ingress**:
   ```bash
   kubectl get ingress -n terminal
   ```

4. **Access the application**:
   - Open your browser and navigate to `https://terminal.YOUR_DOMAIN`
   - You should see the terminal interface

## Troubleshooting

### Pods not starting

```bash
# Check pod logs
kubectl logs -n terminal -l app=terminal-frontend
kubectl logs -n terminal -l app=terminal-backend
kubectl logs -n terminal -l app=postgres

# Check pod status
kubectl describe pod -n terminal <pod-name>
```

### Database connection issues

```bash
# Verify PostgreSQL is running
kubectl get pods -n terminal -l app=postgres

# Check database logs
kubectl logs -n terminal -l app=postgres

# Test database connection
kubectl exec -it -n terminal $(kubectl get pod -n terminal -l app=postgres -o jsonpath='{.items[0].metadata.name}') -- psql -U terminal_user -d terminal_db
```

### Frontend can't reach backend

```bash
# Check backend service
kubectl get svc -n terminal terminal-backend

# Test backend from within cluster
kubectl run -it --rm debug --image=curlimages/curl --restart=Never -- curl http://terminal-backend:8000/health
```

### Ingress not working

```bash
# Check ingress controller
kubectl get pods -n ingress-nginx

# Check ingress resource
kubectl describe ingress -n terminal terminal-ingress

# Verify DNS
nslookup terminal.YOUR_DOMAIN
```

## Updating the Application

1. Make changes to code
2. Rebuild and push images:
   ```bash
   cd applications/terminal
   ./build.sh
   docker push ${DOCKER_REGISTRY}/terminal-frontend:latest
   docker push ${DOCKER_REGISTRY}/terminal-backend:latest
   ```
3. Update image tags in manifests (if using versioned tags)
4. Commit and push to GitHub
5. ArgoCD will automatically sync the changes

## Security Considerations

- ⚠️ **Secrets**: The PostgreSQL password is stored in plain text in `postgres-secret.yaml`. Consider using:
  - Sealed Secrets
  - External Secrets Operator
  - Vault
  - Or at minimum, encrypt the secret before committing

- ⚠️ **CORS**: The backend allows all origins. In production, restrict this:
  ```python
  allow_origins=["https://terminal.YOUR_DOMAIN"]
  ```

- ⚠️ **TLS**: Ensure your ingress controller has TLS certificates configured (cert-manager, Let's Encrypt, etc.)

## Next Steps

- Set up monitoring and logging
- Configure resource limits based on usage
- Set up backup for PostgreSQL
- Implement authentication if needed
- Add more terminal commands
- Customize the ASCII art logo

