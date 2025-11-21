from fastapi import FastAPI, HTTPException, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import os
import subprocess
import logging
from datetime import datetime
from database import get_db, init_db, save_command_history, get_command_history

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Enable docs only in development (when ENABLE_DOCS=true)
# In production, docs are disabled for security
enable_docs = os.getenv("ENABLE_DOCS", "false").lower() == "true"

# Get version from environment variable, build arg, or default
# Priority: 1. API_VERSION env var, 2. Build-time VERSION file, 3. Default
def get_version():
    # Try environment variable first (can be set at runtime or build time)
    version = os.getenv("API_VERSION")
    if version:
        return version
    
    # Try to read from build-time VERSION file (created during Docker build)
    try:
        version_file = os.path.join(os.path.dirname(__file__), "VERSION")
        if os.path.exists(version_file):
            with open(version_file, "r") as f:
                version = f.read().strip()
                if version:
                    return version
    except Exception:
        pass
    
    # Try to get version from git tag (for local development)
    try:
        result = subprocess.run(
            ["git", "describe", "--tags", "--always"],
            capture_output=True,
            text=True,
            timeout=1,
            cwd=os.path.dirname(__file__)
        )
        if result.returncode == 0:
            return result.stdout.strip()
    except (subprocess.TimeoutExpired, FileNotFoundError, subprocess.SubprocessError):
        pass
    
    # Default version
    return "1.0.0"

api_version = get_version()

# Create main FastAPI app (root level for health checks)
app = FastAPI(title="Terminal API", version=api_version)

# Create API v1 router
api_v1_router = APIRouter(prefix="/v1", tags=["v1"])

# Create sub-app for API with docs enabled/disabled
# When api_app is mounted at /api, requests to /api/* become /* in the mounted app
# So docs_url="/docs" means docs are at /api/docs from main app
# To have docs at /api/v1/docs, we need to use root_path or mount differently
# Actually, FastAPI docs are app-level, so we'll put them at /api/docs and add a redirect
api_app = FastAPI(
    title="Terminal API",
    version=api_version,
    docs_url="/docs" if enable_docs else None,
    redoc_url="/redoc" if enable_docs else None,
    openapi_url="/openapi.json" if enable_docs else None,
)

# CORS middleware for both apps
cors_config = {
    "allow_origins": ["*"],  # In production, specify your frontend domain
    "allow_credentials": True,
    "allow_methods": ["*"],
    "allow_headers": ["*"],
}
app.add_middleware(CORSMiddleware, **cors_config)
api_app.add_middleware(CORSMiddleware, **cors_config)

# Initialize database on startup
@api_app.on_event("startup")
async def startup_event():
    init_db()

class CommandRequest(BaseModel):
    command: str

class CommandResponse(BaseModel):
    output: str
    error: Optional[str] = None

# Root level endpoints (for health checks via ingress)
@app.get("/")
async def root():
    return {"message": "Terminal API", "version": api_version}

@app.get("/health")
async def health():
    return {"status": "healthy"}

# API v1 endpoints
@api_v1_router.post("/execute", response_model=CommandResponse)
async def execute_command(request: CommandRequest):
    """
    Execute a terminal command and return the output.
    Commands are executed in a safe, sandboxed environment.
    """
    command = request.command.strip()
    logger.info(f"Execute endpoint called with command: {command}")
    
    if not command:
        return CommandResponse(output="")
    
    # Safe command execution - only allow specific commands
    output = ""
    error = None
    
    try:
        # Simulate command execution
        if command.startswith("ping "):
            host = command.split()[1] if len(command.split()) > 1 else "localhost"
            output = f"PING {host} (127.0.0.1): 56 data bytes\n64 bytes from 127.0.0.1: icmp_seq=0 ttl=64 time=0.123 ms"
        elif command == "uptime":
            output = "up 1 day, 2:30:45, 1 user, load average: 0.15, 0.12, 0.10"
        elif command == "uname -a":
            output = "Linux terminal 5.15.0-91-generic #101-Ubuntu SMP x86_64 GNU/Linux"
        elif command.startswith("cat "):
            filename = command.split()[1] if len(command.split()) > 1 else ""
            if filename:
                output = f"# Contents of {filename}\nThis is a simulated file content.\nLine 1\nLine 2\nLine 3"
            else:
                error = "cat: missing file operand"
        elif command == "df -h":
            output = """Filesystem      Size  Used Avail Use% Mounted on
/dev/sda1        20G  5.2G   14G  28% /
tmpfs           2.0G     0  2.0G   0% /dev/shm"""
        elif command == "free -h":
            output = """              total        used        free      shared  buff/cache   available
Mem:           2.0G        512M        1.2G         32M        256M        1.4G
Swap:          2.0G          0B        2.0G"""
        elif command.startswith("grep "):
            output = "grep: simulated search results"
        elif command == "ps aux":
            output = """USER       PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND
root         1  0.0  0.1  12345  1234 ?        Ss   10:00   0:01 /sbin/init
web-user  1234  0.1  0.2  23456  2345 ?        S    10:05   0:02 node server.js"""
        else:
            # Save command to history
            save_command_history(command, "Command executed")
            output = f"Command '{command}' executed successfully"
    except Exception as e:
        error = str(e)
        output = ""
    
    # Save to database
    try:
        save_command_history(command, output if not error else error)
    except Exception as e:
        # Log error but don't fail the request
        print(f"Error saving to database: {e}")
    
    return CommandResponse(output=output, error=error)

@api_v1_router.get("/history")
async def get_history(limit: int = 50):
    """Get command history from database"""
    logger.info(f"History endpoint called with limit={limit}")
    try:
        history = get_command_history(limit)
        logger.info(f"Retrieved {len(history)} history entries from database")
        return {"history": history}
    except Exception as e:
        logger.error(f"Error retrieving history: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

# Include v1 router in API app
api_app.include_router(api_v1_router)

# Manually serve docs at /v1/docs since FastAPI's automatic docs don't work well
# with custom paths in mounted apps. We'll use FastAPI's built-in openapi() method
# to get the correct schema with all routes included.
if enable_docs:
    from fastapi.openapi.docs import get_swagger_ui_html, get_redoc_html
    from fastapi.responses import JSONResponse
    
    @api_app.get("/v1/docs", include_in_schema=False)
    async def custom_swagger_ui_html():
        """Serve Swagger UI at /api/v1/docs"""
        return get_swagger_ui_html(
            openapi_url="/v1/openapi.json",
            title=f"{api_app.title} - Swagger UI",
        )
    
    @api_app.get("/v1/redoc", include_in_schema=False)
    async def custom_redoc_html():
        """Serve ReDoc at /api/v1/redoc"""
        return get_redoc_html(
            openapi_url="/v1/openapi.json",
            title=f"{api_app.title} - ReDoc",
        )
    
    @api_app.get("/v1/openapi.json", include_in_schema=False)
    async def get_openapi_endpoint():
        """Serve OpenAPI schema at /api/v1/openapi.json"""
        # Use FastAPI's built-in openapi() method to get the schema with all routes
        return JSONResponse(api_app.openapi())

# Mount API app at /api prefix
app.mount("/api", api_app)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

