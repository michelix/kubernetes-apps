# Terminal Web Application

A web-based terminal emulator with Debian-style appearance, built with Next.js, FastAPI, and PostgreSQL, designed to run on Kubernetes with ArgoCD.

## 🏗️ Architecture

- **Frontend**: Next.js 14 with TypeScript and React
- **Backend**: FastAPI (Python)
- **Database**: PostgreSQL 15
- **Orchestration**: Kubernetes with ArgoCD
- **Storage**: LINSTOR (StorageClass: `linstor-lvm-r1`)
- **Ingress**: Cilium Ingress Controller
- **Integration**: Homepage dashboard (automatic service discovery)

## 📁 Project Structure

```
terminal/
├── frontend/              # Next.js frontend application
│   ├── app/              # Next.js app directory
│   ├── Dockerfile        # Frontend container image
│   └── package.json      # Node.js dependencies
├── backend/              # FastAPI backend application
│   ├── main.py          # FastAPI application
│   ├── database.py      # Database models and operations
│   ├── requirements.txt # Python dependencies
│   └── Dockerfile       # Backend container image
├── manifests/            # Kubernetes manifests
│   ├── namespace.yaml
│   ├── postgres-*.yaml  # PostgreSQL resources (Deployment, Service, PVC, Secret, ConfigMap)
│   ├── backend-*.yaml   # Backend resources (Deployment, Service)
│   ├── frontend-*.yaml  # Frontend resources (Deployment, Service)
│   └── ingress.yaml     # Ingress configuration with Homepage annotations
├── build.sh              # Build script for Docker images
├── application.yaml      # ArgoCD Application definition
└── README.md            # This file
```

## 🚀 Getting Started

### Prerequisites

- Docker (for building images)
- Kubernetes cluster with:
  - ArgoCD installed and configured
  - Cilium Ingress Controller
  - LINSTOR storage provisioner (or update StorageClass in `postgres-pvc.yaml`)
  - Metrics Server (for Homepage Kubernetes widget)
- Container registry access (Docker Hub, GitHub Container Registry, etc.)
- Git repository access

### Configuration

**Important**: This repository uses placeholders (`YOUR_REGISTRY`, `YOUR_DOMAIN`, `YOUR_USERNAME`) to keep personal information out of the public repository. You must configure these values before building and deploying.

#### Initial Setup

1. **Configure Your Environment** (from repository root):
```bash
# Run the configuration script to create your config file
./configure.sh

# Edit the generated config file with your values
nano config
```

**Required Configuration Values:**
- `DOMAIN`: Your domain name (e.g., `example.com`)
- `DOCKER_REGISTRY`: Your Docker registry (e.g., `docker.io/username` or `ghcr.io/username`)
- `REPO_USERNAME`: Your GitHub username
- `LOCATION`, `LATITUDE`, `LONGITUDE`, `TIMEZONE`: For Homepage weather widget

2. **Apply Configuration**:
```bash
# Run the script again to apply your configuration
./configure.sh
```

This script will:
- Replace `YOUR_REGISTRY` with your Docker registry in deployment manifests
- Replace `YOUR_DOMAIN` with your domain in ingress manifests
- Replace `YOUR_USERNAME` with your GitHub username in application.yaml
- Update Homepage configuration with your settings

**Note**: The `config` file is automatically excluded from Git commits (via `.gitignore`) to protect your personal information.

### Building Docker Images

The application includes a build script that handles building and optionally pushing images.

#### Using the Build Script

The build script automatically reads your Docker registry from the `config` file:

```bash
cd applications/terminal

# Build images (uses DOCKER_REGISTRY from config file)
./build.sh

# Or override with environment variable
DOCKER_REGISTRY=docker.io/yourusername ./build.sh

# Build and push images
PUSH_IMAGES=true ./build.sh

# Build with custom version
VERSION=v1.0.0 ./build.sh
```

The build script will:
- Read `DOCKER_REGISTRY` from the repository root `config` file (if available)
- Fall back to `DOCKER_REGISTRY` environment variable if set
- Build frontend and backend Docker images
- Tag images with version (commit SHA or custom version) and `latest`
- Optionally push images if `PUSH_IMAGES=true` is set
- Validate that registry is configured (not a placeholder)

#### Manual Building

If you prefer to build manually:

1. **Build Frontend Image**:
```bash
cd applications/terminal/frontend
docker build -t YOUR_REGISTRY/terminal-frontend:latest .
docker push YOUR_REGISTRY/terminal-frontend:latest
```

2. **Build Backend Image**:
```bash
cd applications/terminal/backend
docker build -t YOUR_REGISTRY/terminal-backend:latest .
docker push YOUR_REGISTRY/terminal-backend:latest
```

**Note**: Replace `YOUR_REGISTRY` with your actual registry (e.g., `docker.io/username`).

### Additional Configuration

1. **Storage Configuration** (if not using LINSTOR):
   - `manifests/postgres-pvc.yaml`: Update `storageClassName` to match your cluster's storage provisioner

### Deploying with ArgoCD

1. **Push to Git Repository**:
```bash
git add applications/terminal/
git commit -m "feat: add terminal application"
git push origin main
```

2. **Create ArgoCD Application**:

   **Option 1: Using kubectl** (Recommended)
   ```bash
   kubectl apply -f applications/terminal/application.yaml
   ```
   
   **Option 2: Using ArgoCD UI**
   - Application Name: `terminal`
   - Project: `default`
   - Repository URL: `https://github.com/YOUR_USERNAME/kubernetes-apps.git` (replaced by configure.sh)
   - Path: `applications/terminal/manifests`
   - Cluster URL: `https://kubernetes.default.svc`
   - Namespace: `terminal`
   - Sync Policy: Enable `Auto-Create Namespace`, `Auto-Sync`, `Self-Heal`, and `Prune`

3. **Verify Deployment**:
```bash
# Check application status
kubectl get application terminal -n argocd

# Check pods
kubectl get pods -n terminal

# Check ingress
kubectl get ingress -n terminal
```

4. **Access the Application**:
   - Web UI: `https://terminal.YOUR_DOMAIN`
   - The service will automatically appear in Homepage dashboard (if configured)

### Homepage Integration

The terminal application is automatically discovered by Homepage through ingress annotations:

```yaml
annotations:
  gethomepage.dev/enabled: "true"
  gethomepage.dev/name: "Terminal"
  gethomepage.dev/description: "Web-based Terminal Emulator"
  gethomepage.dev/group: "Kubernetes Services"
  gethomepage.dev/icon: terminal.png
```

The service will appear in the "Kubernetes Services" section of your Homepage dashboard.

## 🎮 Features

- **Terminal-like UI**: Debian-style terminal appearance with green text on dark background
- **Interactive Commands**: Execute various terminal commands
- **Command History**: View and navigate through command history (stored in PostgreSQL, session-based)
- **Version Display**: Backend version automatically fetched and displayed in `neofetch` and `about` commands
- **Weather Integration**: Fetch weather information using the `weather` command
- **ASCII Art**: Displays ASCII logo on initial load
- **Real-time Cursor**: Blinking cursor that mimics real terminal
- **Help System**: Type `help` or press Enter to see available commands
- **Health Checks**: Built-in liveness and readiness probes for Kubernetes

## 📝 Available Commands

- `help` - Show available commands
- `clear` - Clear the terminal
- `date` - Show current date and time
- `whoami` - Show current user
- `echo <text>` - Echo text back
- `ls` - List files (simulated)
- `pwd` - Print working directory
- `history` - Show command history from database
- `neofetch` - Display system information with backend version
- `about` - Show information about the terminal (includes backend version)
- `weather [location]` - Fetch weather information for a location
  - If no location is provided:
    - If `DEFAULT_WEATHER_LOCATION` environment variable is set, uses that default location
    - Otherwise, displays usage instructions
  - Example: `weather London` or `weather Dornbirn`
  - Uses the wttr.in API service
- `exit` - Reload the page

## 🔌 API Endpoints

The backend provides the following REST API endpoints:

### Root Endpoints

- **GET `/`** - Returns API information and version
  - Response: `{"message": "Terminal API", "version": "1.0.0"}`
  
- **GET `/api`** - Returns API information and version (accessible via ingress)
  - Response: `{"message": "Terminal API", "version": "1.0.0"}`
  - Used by frontend to fetch backend version for display in `neofetch` and `about` commands

- **GET `/health`** - Health check endpoint
  - Response: `{"status": "healthy"}`
  - Used by Kubernetes liveness and readiness probes

### API Endpoints

- **POST `/api/execute`** - Execute a terminal command
  - Request body:
    ```json
    {
      "command": "ls",
      "session_id": "session_1234567890_abc123"
    }
    ```
  - Response:
    ```json
    {
      "output": "file1.txt\nfile2.txt",
      "error": null
    }
    ```
  - The `session_id` is optional but recommended for session-based command history

- **GET `/api/history`** - Retrieve command history for a session
  - Query parameters:
    - `session_id` (required): Session identifier
    - `limit` (optional, default: 50): Maximum number of history entries to return
  - Example: `GET /api/history?session_id=session_1234567890_abc123&limit=50`
  - Response:
    ```json
    {
      "history": [
        {
          "command": "ls",
          "output": "file1.txt\nfile2.txt",
          "timestamp": "2025-01-15T10:30:00Z"
        }
      ]
    }
    ```

### Weather Command

The `weather` command is handled by the `/api/execute` endpoint:
- **Command**: `weather [location]`
- **Backend Processing**: The backend extracts the location from the command and calls the wttr.in API
- **Default Location Behavior**:
  - If no location is specified in the command:
    - If `DEFAULT_WEATHER_LOCATION` environment variable is set, that location is used
    - If `DEFAULT_WEATHER_LOCATION` is not set, a usage message is returned: `"Usage: weather [location]\nExample: weather London"`
- **Validation**: Location names are validated (alphanumeric, spaces, hyphens, commas only, max 100 characters)
- **Response**: Returns formatted weather information with ANSI codes removed
- **Error Handling**: Returns user-friendly error messages for timeouts or invalid locations

### Documentation Endpoints (Development Only)

These endpoints are only available when `ENABLE_DOCS=true` is set:

- **GET `/docs`** - Interactive API documentation (Swagger UI)
- **GET `/redoc`** - Alternative API documentation (ReDoc)
- **GET `/openapi.json`** - OpenAPI specification in JSON format

## 🔧 Development

### Running Locally

**Prerequisites**:
- Node.js 18+ and npm
- Python 3.10+
- PostgreSQL 15 (or Docker)

**Frontend**:
```bash
cd applications/terminal/frontend
npm install
npm run dev
# Frontend runs on http://localhost:3000
```

**Backend**:
```bash
cd applications/terminal/backend
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
# Backend runs on http://localhost:8000
```

**Database** (using Docker):
```bash
docker run -d \
  --name postgres \
  -e POSTGRES_USER=terminal_user \
  -e POSTGRES_PASSWORD=terminal_pass \
  -e POSTGRES_DB=terminal_db \
  -p 5432:5432 \
  postgres:15-alpine
```

### Environment Variables

**Frontend**:
- `NEXT_PUBLIC_API_URL`: Backend API URL
  - Local: `http://localhost:8000`
  - Kubernetes: `/api` (relative path via ingress)

**Backend**:
- `DATABASE_URL`: PostgreSQL connection string
  - Format: `postgresql://user:password@host:port/database`
  - Kubernetes: `postgresql://terminal_user:terminal_pass@postgres:5432/terminal_db`
- `DEFAULT_WEATHER_LOCATION`: Default location for weather command when no location is specified
  - Example: `"Dornbirn"` or `"London,UK"`
  - Used when user runs `weather` without a location parameter
  - If not set, the `weather` command without a location will show usage instructions instead
  - **Configuration**: Must be set in the backend deployment manifest at `applications/terminal/manifests/backend-deployment.yaml` in the `env` section:
    ```yaml
    env:
    - name: DEFAULT_WEATHER_LOCATION
      value: "Dornbirn"  # Your default location
    ```
- `ENABLE_DOCS`: Enable API documentation endpoints (`/docs`, `/redoc`, `/openapi.json`)
  - Set to `"true"` for development, `"false"` (default) for production
  - When disabled, these endpoints return 404 for security
- `SHOW_DETAILED_ERRORS`: Show detailed error messages in API responses
  - Set to `"true"` for development, `"false"` (default) for production
  - When disabled, generic error messages are returned to prevent information disclosure
- `API_VERSION`: Override the API version string
  - If not set, version is determined from build-time VERSION file or git tags
  - Falls back to `"1.0.0"` if no version source is available

## 📊 Database Schema

The application uses a simple schema:

```sql
CREATE TABLE command_history (
    id SERIAL PRIMARY KEY,
    command VARCHAR(500) NOT NULL,
    output TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 🔒 Security Notes

- The terminal executes commands in a sandboxed environment
- Only safe, predefined commands are executed
- Database credentials are stored in Kubernetes secrets
- In production, consider:
  - Using proper secrets management (e.g., Sealed Secrets, External Secrets Operator)
  - Implementing authentication/authorization
  - Restricting CORS origins
  - Using TLS certificates (cert-manager)
  - Network policies to restrict pod-to-pod communication

## 🐛 Troubleshooting

### Application Not Appearing in ArgoCD

**Check Application Status**:
```bash
kubectl get application terminal -n argocd
kubectl describe application terminal -n argocd
```

**Common Issues**:
- Repository URL incorrect: Check `application.yaml` `repoURL` matches your Git repository
- Path incorrect: Verify `path: applications/terminal/manifests` exists
- Repository not accessible: Check ArgoCD repository credentials

### Pods Not Starting

**Check Pod Status**:
```bash
kubectl get pods -n terminal
kubectl describe pod <pod-name> -n terminal
```

**Common Issues**:
- **ImagePullBackOff**: Image not found or registry credentials missing
  ```bash
  # Check image exists (replace with your registry)
  docker pull YOUR_REGISTRY/terminal-frontend:latest
  
  # Check image pull secrets
  kubectl get secrets -n terminal
  
  # Verify image reference in deployment
  kubectl get deployment terminal-frontend -n terminal -o jsonpath='{.spec.template.spec.containers[0].image}'
  ```

- **CrashLoopBackOff**: Application error
  ```bash
  # Check logs
  kubectl logs -n terminal -l app=terminal-frontend --tail=50
  kubectl logs -n terminal -l app=terminal-backend --tail=50
  ```

- **Pending**: Resource constraints or storage issues
  ```bash
  # Check events
  kubectl get events -n terminal --sort-by='.lastTimestamp'
  
  # Check PVC status
  kubectl get pvc -n terminal
  kubectl describe pvc postgres-pvc -n terminal
  ```

### Database Connection Issues

**Check PostgreSQL**:
```bash
# Verify PostgreSQL pod is running
kubectl get pods -n terminal -l app=postgres

# Check PostgreSQL logs
kubectl logs -n terminal -l app=postgres --tail=50

# Verify database secret exists
kubectl get secret postgres-secret -n terminal

# Test database connection (from backend pod)
kubectl exec -it -n terminal deployment/terminal-backend -- \
  python -c "from database import engine; engine.connect()"
```

**Common Issues**:
- **PVC Pending**: Storage class not available
  - Check available storage classes: `kubectl get storageclass`
  - Update `postgres-pvc.yaml` with correct `storageClassName`
  
- **Connection Refused**: Database not ready or network issue
  - Wait for PostgreSQL to be ready: `kubectl wait --for=condition=ready pod -l app=postgres -n terminal --timeout=300s`
  - Check service: `kubectl get svc postgres -n terminal`

### Frontend Not Connecting to Backend

**Check Services**:
```bash
# Verify services exist
kubectl get svc -n terminal

# Test backend service
kubectl port-forward -n terminal svc/terminal-backend 8000:8000
curl http://localhost:8000/health
```

**Check Ingress**:
```bash
# Verify ingress configuration
kubectl get ingress -n terminal
kubectl describe ingress terminal-ingress -n terminal

# Check ingress controller logs
kubectl logs -n kube-system -l app.kubernetes.io/name=cilium
```

**Common Issues**:
- Backend service not accessible: Check service selector matches deployment labels
- Ingress path routing incorrect: Verify `/api` path is correctly configured
- DNS not resolving: Check DNS records point to your cluster's ingress IP

### Homepage Integration Issues

**Service Not Appearing in Homepage**:
- Verify ingress annotations are present:
  ```bash
  kubectl get ingress terminal-ingress -n terminal -o yaml | grep gethomepage
  ```
- Check Homepage logs for service discovery:
  ```bash
  kubectl logs -n homepage -l app=homepage --tail=50 | grep terminal
  ```
- Ensure ingress has correct labels:
  ```bash
  kubectl get ingress terminal-ingress -n terminal -o yaml | grep app.kubernetes.io/name
  ```

**Service Showing as Offline**:
- Verify frontend deployment has matching label:
  ```bash
  kubectl get deployment terminal-frontend -n terminal -o yaml | grep app.kubernetes.io/name
  ```
- Check pod labels match ingress labels for health checks

### ArgoCD Sync Issues

**Manual Sync**:
```bash
# Trigger sync manually
kubectl patch application terminal -n argocd --type merge -p '{"operation":{"initiatedBy":{"username":"admin"},"sync":{"revision":"HEAD"}}}'

# Or use ArgoCD CLI
argocd app sync terminal
```

**Check Sync History**:
```bash
kubectl get application terminal -n argocd -o yaml | grep -A 20 status
```

## 📚 Additional Resources

- [ArgoCD Documentation](https://argo-cd.readthedocs.io/)
- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Cilium Ingress Documentation](https://docs.cilium.io/en/stable/network/servicemesh/ingress/)
- [Homepage Documentation](https://gethomepage.dev/)

## 📄 License

This project is provided as-is for educational and personal use.
