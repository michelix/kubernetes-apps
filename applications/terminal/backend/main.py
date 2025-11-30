from fastapi import FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel, field_validator
from typing import Optional
import os
import subprocess
import logging
import re
import requests
from datetime import datetime
from database import get_db, init_db, save_command_history, get_command_history

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Enable docs only in development (when ENABLE_DOCS=true)
# In production, docs are disabled for security
enable_docs = os.getenv("ENABLE_DOCS", "false").lower() == "true"

# Control error detail level (for security)
# Set to "true" to show detailed errors (development only)
# Set to "false" to show generic errors (production)
show_detailed_errors = os.getenv("SHOW_DETAILED_ERRORS", "false").lower() == "true"

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

# Create main FastAPI app
app = FastAPI(
    title="Terminal API",
    version=api_version,
    docs_url="/docs" if enable_docs else None,
    redoc_url="/redoc" if enable_docs else None,
    openapi_url="/openapi.json" if enable_docs else None,
)

# CORS middleware
cors_config = {
    "allow_origins": ["*"],  # In production, specify your frontend domain
    "allow_credentials": True,
    "allow_methods": ["*"],
    "allow_headers": ["*"],
}
app.add_middleware(CORSMiddleware, **cors_config)

# Custom exception handler to sanitize error messages for security
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle validation errors - sanitize messages to prevent information disclosure"""
    if show_detailed_errors:
        # Development mode: show detailed errors
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={"detail": exc.errors()}
        )
    else:
        # Production mode: show generic error
        logger.warning(f"Validation error from {request.client.host}: {exc.errors()}")
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"detail": "Invalid input provided"}
        )

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Handle HTTP exceptions - sanitize messages for security"""
    if show_detailed_errors:
        # Development mode: show original error
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail}
        )
    else:
        # Production mode: show generic error based on status code
        logger.warning(f"HTTP {exc.status_code} from {request.client.host}: {exc.detail}")
        if exc.status_code == 400:
            return JSONResponse(
                status_code=400,
                content={"detail": "Invalid request"}
            )
        elif exc.status_code == 500:
            return JSONResponse(
                status_code=500,
                content={"detail": "Internal server error"}
            )
        else:
            return JSONResponse(
                status_code=exc.status_code,
                content={"detail": "An error occurred"}
            )

# Initialize database on startup
@app.on_event("startup")
async def startup_event():
    init_db()

class CommandRequest(BaseModel):
    command: str
    session_id: Optional[str] = None  # Optional session ID for history isolation
    
    @field_validator('session_id')
    @classmethod
    def validate_session_id(cls, v: Optional[str]) -> Optional[str]:
        """Validate session_id format and length to prevent injection attacks"""
        if v is None or v == "":
            return None
        # Session ID should be alphanumeric with underscores/hyphens, max 100 chars
        if len(v) > 100:
            raise ValueError("session_id must be 100 characters or less")
        # Allow alphanumeric, underscore, hyphen, and dot (for session_ prefix)
        if not re.match(r'^[a-zA-Z0-9_.-]+$', v):
            raise ValueError("session_id contains invalid characters")
        return v
    
    @field_validator('command')
    @classmethod
    def validate_command(cls, v: str) -> str:
        """Validate command length to prevent abuse"""
        if len(v) > 500:
            raise ValueError("command must be 500 characters or less")
        return v.strip()

class CommandResponse(BaseModel):
    output: str
    error: Optional[str] = None

async def get_weather(location: Optional[str] = None) -> str:
    """
    Fetch weather from wttr.in API.
    
    Args:
        location: Optional location string. If None, uses DEFAULT_WEATHER_LOCATION env var or returns usage message.
    
    Returns:
        Formatted weather output with ANSI codes removed.
    """
    # If no location provided, check for default location
    if not location or (isinstance(location, str) and location.strip() == ""):
        default_location = os.getenv("DEFAULT_WEATHER_LOCATION")
        if default_location:
            location = default_location.strip()
        else:
            return "Usage: weather [location]\nExample: weather London"
    
    # Validate location format (alphanumeric, spaces, hyphens, commas)
    # location is guaranteed to be a non-empty string at this point
    location = location.strip()
    if len(location) > 100:
        return "Error: Location name is too long (max 100 characters)."
    
    if not re.match(r'^[a-zA-Z0-9\s,-]+$', location):
        return "Error: Invalid location. Only letters, numbers, spaces, hyphens, and commas are allowed."
    
    try:
        # Call wttr.in API with ?A flag to disable ANSI colors (but we'll still clean them)
        # Using format=1 for plain text, or format=2 for minimal output
        # We'll use the default format and clean ANSI codes ourselves
        url = f"https://wttr.in/{location}?A"
        
        # Set timeout and user agent
        headers = {
            "User-Agent": "curl/7.68.0"  # wttr.in prefers curl user agent
        }
        
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        
        # Clean ANSI escape codes
        ansi_escape = re.compile(r'\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])')
        clean_output = ansi_escape.sub('', response.text)
        
        # Remove promotional text
        clean_output = clean_output.replace("Follow @igor_chubin for wttr.in updates", "")
        clean_output = clean_output.replace("If you like wttr.in, you can donate here: https://wttr.in/donate", "")
        
        # Clean up any extra whitespace
        clean_output = clean_output.strip()
        
        return clean_output
        
    except requests.exceptions.Timeout:
        logger.error(f"Weather API timeout for location: {location}")
        return "Error: Weather service timeout. Please try again later."
    except requests.exceptions.RequestException as e:
        logger.error(f"Weather API error for location '{location}': {e}")
        return "Error: Unable to fetch weather data. Please check the location and try again."
    except Exception as e:
        logger.error(f"Unexpected error fetching weather for '{location}': {e}", exc_info=True)
        return "Error: Unable to fetch weather data. Please try again later."

# Root level endpoints
@app.get("/")
async def root():
    return {"message": "Terminal API", "version": api_version}

@app.get("/health")
async def health():
    return {"status": "healthy"}

# API endpoints (no versioning - simplified)
@app.post("/api/execute", response_model=CommandResponse)
async def execute_command(request: CommandRequest):
    """
    Execute a terminal command and return the output.
    Commands are executed in a safe, sandboxed environment.
    """
    # Command is already validated and stripped by Pydantic validator
    command = request.command
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
        elif command.startswith("weather"):
            # Extract location from command (e.g., "weather London" -> "London")
            location = command.split(" ", 1)[1] if len(command.split()) > 1 else None
            output = await get_weather(location)
        else:
            # For unknown commands, just return a message
            output = f"Command '{command}' executed successfully"
    except Exception as e:
        error = str(e)
        output = ""
    
    # Save to database (only once, after command execution)
    # Only save if session_id is provided (for session-based history)
    if request.session_id:
        try:
            save_command_history(request.session_id, command, output if not error else error)
        except Exception as e:
            # Log error but don't fail the request
            logger.error(f"Error saving to database: {e}")
    
    return CommandResponse(output=output, error=error)

@app.get("/api/history")
async def get_history(session_id: Optional[str] = None, limit: int = 50):
    """Get command history from database for a specific session"""
    if not session_id:
        logger.warning("History endpoint called without session_id, returning empty history")
        return {"history": []}
    
    # Validate session_id format (same validation as CommandRequest)
    if len(session_id) > 100 or not re.match(r'^[a-zA-Z0-9_.-]+$', session_id):
        logger.warning(f"Invalid session_id format received: {session_id[:20]}...")
        # Use generic error message to prevent information disclosure
        error_detail = "Invalid session_id format" if show_detailed_errors else "Invalid request"
        raise HTTPException(status_code=400, detail=error_detail)
    
    # Validate limit to prevent abuse
    if limit < 1 or limit > 1000:
        limit = 50  # Default to 50 if invalid
    
    logger.info(f"History endpoint called with session_id={session_id[:8]}... and limit={limit}")
    try:
        history = get_command_history(session_id, limit)
        logger.info(f"Retrieved {len(history)} history entries for session")
        return {"history": history}
    except Exception as e:
        logger.error(f"Error retrieving history: {e}", exc_info=True)
        # Don't expose internal error details to users
        error_detail = str(e) if show_detailed_errors else "Internal server error"
        raise HTTPException(status_code=500, detail=error_detail)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

