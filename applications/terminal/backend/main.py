from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import os
from datetime import datetime
from database import get_db, init_db, save_command_history, get_command_history

app = FastAPI(title="Terminal API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database on startup
@app.on_event("startup")
async def startup_event():
    init_db()

class CommandRequest(BaseModel):
    command: str

class CommandResponse(BaseModel):
    output: str
    error: Optional[str] = None

@app.get("/")
async def root():
    return {"message": "Terminal API", "version": "1.0.0"}

@app.get("/health")
async def health():
    return {"status": "healthy"}

@app.post("/api/execute", response_model=CommandResponse)
async def execute_command(request: CommandRequest):
    """
    Execute a terminal command and return the output.
    Commands are executed in a safe, sandboxed environment.
    """
    command = request.command.strip()
    
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

@app.get("/api/history")
async def get_history(limit: int = 50):
    """Get command history from database"""
    try:
        history = get_command_history(limit)
        return {"history": history}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

