# CI/CD Setup Guide

This document explains how to set up the automated CI/CD pipeline for the Terminal application.

## Overview

The CI/CD pipeline automatically:
1. Builds Docker images when code changes are pushed to the `main` branch
2. Tags images with the commit hash (short SHA) and `latest`
3. Pushes images to Docker Hub
4. Updates Kubernetes deployment manifests with the new image tags
5. Commits the updated manifests back to the repository
6. ArgoCD automatically syncs and deploys the new version

## Prerequisites

- GitHub repository with Actions enabled
- Docker Hub account
- ArgoCD configured and connected to your repository

## Setup Steps

### 1. Configure GitHub Secrets

You need to add Docker Hub credentials as GitHub secrets:

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add the following secrets:

   - **Name**: `DOCKERHUB_USERNAME`
     - **Value**: Your Docker Hub username (e.g., `michelix`)

   - **Name**: `DOCKERHUB_TOKEN`
     - **Value**: Your Docker Hub access token
     - To create a token:
       1. Go to https://hub.docker.com/settings/security
       2. Click **New Access Token**
       3. Give it a name (e.g., "GitHub Actions")
       4. Set permissions to **Read & Write**
       5. Copy the token and save it as the secret

### 2. Verify Workflow Configuration

The workflow file is located at `.github/workflows/terminal-build-deploy.yml`.

Key configuration points:
- **Registry**: `docker.io` (Docker Hub)
- **Image names**: `michelix/terminal-frontend` and `michelix/terminal-backend`
- **Trigger**: Pushes to `main` branch when files in `applications/terminal/` change

To customize:
- Edit the `env` section in the workflow file
- Change `REGISTRY`, `FRONTEND_IMAGE`, or `BACKEND_IMAGE` as needed

### 3. How It Works

#### Automatic Deployment Flow

```
Code Change → Push to GitHub
    ↓
GitHub Actions Workflow Triggers
    ↓
Build Docker Images
    ↓
Tag with Commit Hash (e.g., e197848)
    ↓
Push to Docker Hub
    ↓
Update Deployment Manifests
    ↓
Commit & Push Updated Manifests
    ↓
ArgoCD Detects Changes
    ↓
ArgoCD Syncs & Deploys
    ↓
New Version Running in Kubernetes
```

#### Image Tagging Strategy

- **Commit Hash Tag**: `michelix/terminal-frontend:e197848` (unique per commit)
- **Latest Tag**: `michelix/terminal-frontend:latest` (always points to most recent)

The deployment manifests use the commit hash tag, ensuring:
- Each deployment is traceable to a specific commit
- Rollbacks are easy (just change the tag in the manifest)
- No caching issues with `latest` tag

### 4. Manual Workflow Trigger

You can manually trigger the workflow:

1. Go to **Actions** tab in GitHub
2. Select **Build and Deploy Terminal Application**
3. Click **Run workflow**
4. Select branch and click **Run workflow**

### 5. Local Development

For local builds, use the `build.sh` script:

```bash
cd applications/terminal

# Build with commit hash (automatic)
./build.sh

# Build with custom version
VERSION=v1.0.0 ./build.sh

# Build and push
DOCKER_REGISTRY=docker.io/michelix PUSH_IMAGES=true ./build.sh
```

### 6. Troubleshooting

#### Workflow Not Triggering

- Check that Actions are enabled in repository settings
- Verify the workflow file is in `.github/workflows/`
- Ensure you're pushing to the `main` branch
- Check that files changed are in `applications/terminal/`

#### Docker Hub Authentication Failed

- Verify `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN` secrets are set correctly
- Check that the token has **Read & Write** permissions
- Ensure the token hasn't expired

#### Images Not Updating in Kubernetes

- Check ArgoCD sync status
- Verify the deployment manifest was updated with the new tag
- Check if ArgoCD auto-sync is enabled
- Manually sync in ArgoCD UI if needed

#### View Workflow Logs

1. Go to **Actions** tab in GitHub
2. Click on the workflow run
3. Expand the job and steps to see detailed logs

### 7. Best Practices

1. **Always use commit hash tags** for production deployments
2. **Keep `latest` tag** for convenience, but don't rely on it for deployments
3. **Monitor ArgoCD** to ensure deployments succeed
4. **Test locally** before pushing to main branch
5. **Review workflow logs** after each deployment

### 8. Rollback Procedure

To rollback to a previous version:

1. Find the commit hash of the previous working version
2. Update the deployment manifest:
   ```bash
   # Edit manifests/frontend-deployment.yaml
   # Change image tag from current to previous commit hash
   ```
3. Commit and push the change
4. ArgoCD will automatically deploy the previous version

Or use ArgoCD UI:
1. Go to ArgoCD application
2. Click **History and Rollback**
3. Select the previous revision
4. Click **Rollback**

## Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Docker Hub Documentation](https://docs.docker.com/docker-hub/)
- [ArgoCD Documentation](https://argo-cd.readthedocs.io/)

