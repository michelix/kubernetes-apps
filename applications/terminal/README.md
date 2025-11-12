# Terminal Web Application

A web-based terminal emulator with Debian-style appearance, built with Next.js, FastAPI, and PostgreSQL, designed to run on Kubernetes with ArgoCD.

## 🏗️ Architecture

- **Frontend**: Next.js 14 with TypeScript and React
- **Backend**: FastAPI (Python)
- **Database**: PostgreSQL 15
- **Orchestration**: Kubernetes with ArgoCD

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
│   ├── postgres-*.yaml  # PostgreSQL resources
│   ├── backend-*.yaml   # Backend resources
│   ├── frontend-*.yaml  # Frontend resources
│   └── ingress.yaml     # Ingress configuration
└── application.yaml      # ArgoCD Application definition
```

## 🚀 Getting Started

### Prerequisites

- Docker (for building images)
- Kubernetes cluster
- ArgoCD installed and configured
- Container registry (Docker Hub, GitHub Container Registry, etc.)

### Building Docker Images

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

### Configuration

Before deploying, update the following files:

1. **Update Image References**:
   - `manifests/frontend-deployment.yaml`: Replace `YOUR_REGISTRY/terminal-frontend:latest`
   - `manifests/backend-deployment.yaml`: Replace `YOUR_REGISTRY/terminal-backend:latest`

2. **Update Domain**:
   - `manifests/ingress.yaml`: Replace `terminal.YOUR_DOMAIN` with your actual domain

3. **Update ArgoCD Application**:
   - `application.yaml`: Replace `YOUR_USERNAME` with your GitHub username

### Deploying with ArgoCD

1. **Push to GitHub**:
```bash
git add .
git commit -m "Add terminal application"
git push origin main
```

2. **Create ArgoCD Application**:
   - Option 1: Apply the application.yaml directly:
   ```bash
   kubectl apply -f applications/terminal/application.yaml
   ```
   
   - Option 2: Use ArgoCD UI:
     - Application Name: `terminal`
     - Repository URL: `https://github.com/YOUR_USERNAME/kubernetes-apps.git`
     - Path: `applications/terminal/manifests`
     - Cluster URL: `https://kubernetes.default.svc`
     - Namespace: `terminal`

3. **Sync Application**:
   - ArgoCD will automatically sync if automated sync is enabled
   - Or manually sync from ArgoCD UI

## 🎮 Features

- **Terminal-like UI**: Debian-style terminal appearance with green text on dark background
- **Interactive Commands**: Execute various terminal commands
- **Command History**: View and navigate through command history
- **ASCII Art**: Displays ASCII logo on initial load
- **Real-time Cursor**: Blinking cursor that mimics real terminal
- **Help System**: Type `help` or press Enter to see available commands

## 📝 Available Commands

- `help` - Show available commands
- `clear` - Clear the terminal
- `date` - Show current date and time
- `whoami` - Show current user
- `echo <text>` - Echo text back
- `ls` - List files (simulated)
- `pwd` - Print working directory
- `history` - Show command history
- `about` - Show information about the terminal
- `exit` - Reload the page

## 🔧 Development

### Running Locally

**Frontend**:
```bash
cd frontend
npm install
npm run dev
```

**Backend**:
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

**Database**:
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
- `NEXT_PUBLIC_API_URL`: Backend API URL (default: `http://localhost:8000`)

**Backend**:
- `DATABASE_URL`: PostgreSQL connection string

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
  - Using proper secrets management
  - Implementing authentication
  - Restricting CORS origins
  - Using TLS certificates

## 🐛 Troubleshooting

**Frontend not connecting to backend**:
- Check that `NEXT_PUBLIC_API_URL` is set correctly
- Verify backend service is running: `kubectl get pods -n terminal`
- Check backend logs: `kubectl logs -n terminal -l app=terminal-backend`

**Database connection issues**:
- Verify PostgreSQL is running: `kubectl get pods -n terminal -l app=postgres`
- Check database logs: `kubectl logs -n terminal -l app=postgres`
- Verify secret exists: `kubectl get secret -n terminal postgres-secret`

**Ingress not working**:
- Verify ingress controller is installed
- Check ingress resource: `kubectl describe ingress -n terminal terminal-ingress`
- Verify DNS is pointing to your cluster

## 📄 License

This project is provided as-is for educational and personal use.


## Prompt:
Create a web application with a terminal-style interface that visually and functionally resembles the Debian terminal. The interface should behave like a real terminal for most common actions. When the user presses Enter with no input, it should display a list of available commands.
The design should include:
- A Debian-like cursor and theme (colors, fonts, layout).
- An ASCII art logo (for example, a stylized .NET logo) displayed on load and within the terminal window.
Tech stack:
- Frontend: Next.js (React + TypeScript)
- Backend: FastAPI (Python)
- Database: PostgreSQL
Infrastructure requirements:
- The entire app must be deployable in a Kubernetes cluster.
- It should integrate smoothly with an existing ArgoCD setup for automated deployment.
- I should be able to push the code to my GitHub repo, configure the repository URL in ArgoCD, and have the system deploy everything automatically.
