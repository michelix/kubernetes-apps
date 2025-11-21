'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import axios from 'axios'

// Use relative path in production (works with ingress), absolute URL in development
const API_URL = process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' ? '/api' : 'http://localhost:8000')

interface CommandHistory {
  command: string
  output: string
  timestamp: Date
}

const NEOFETCH_OUTPUT = `                    
web-user@terminal
---------------
                11111111                 OS: Kubernetes Terminal
            7113590000953111             Host: Terminal Web App
        111348888800808888853111         Kernel: Next.js 14
    71359888888888077088888888895315     Uptime: Just started
   7488000088000000770000008800008905    Packages: npm + pip
   38880770000777777777777000077088847   Shell: web-terminal
  148880077777770007700077777770088883   Resolution: Browser
  4888880007777000077000077770008888841  DE: Web Browser
 38888880077037777777777773077008888893  WM: Not applicable
 588888807760000727777370000877088888847 Theme: Dark
3888800007700577721001377720077000088881 Icons: Terminal
1888087777777777777777777777777777808881 Font: Courier New
1888095000775000077777700000770006908881 CPU: Browser Engine
7598800080077700778000770077700800088841 GPU: WebGL
  348888800007777700007777730008888842   Memory: Dynamic
   7248888800077777777777700088888437    
     148888807700000000007708888841      
      7348880200088888800030888427       
        134800008888888880008951         
          71111111111111111111           
                                
Welcome to the Terminal
`

const HELP_TEXT = `Available commands:
  help          - Show this help message
  clear         - Clear the terminal
  date          - Show current date and time
  whoami        - Show current user
  echo <text>   - Echo text back
  ls            - List files (simulated)
  pwd           - Print working directory
  history       - Show command history
  neofetch      - Display system information
  about         - Show information about this terminal
  exit          - Exit the terminal (reloads page)

Type a command and press Enter to execute.`

export default function Terminal() {
  const [history, setHistory] = useState<CommandHistory[]>([])
  const [currentInput, setCurrentInput] = useState('')
  const [showCursor, setShowCursor] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [showLogo, setShowLogo] = useState(false)
  const terminalRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Cursor blink effect
  useEffect(() => {
    const interval = setInterval(() => {
      setShowCursor((prev) => !prev)
    }, 530)
    return () => clearInterval(interval)
  }, [])

  // Auto-scroll to bottom
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [history])

  // Focus input on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [])

  const executeCommand = useCallback(async (command: string) => {
    const trimmedCommand = command.trim()
    if (!trimmedCommand) {
      // Show help when just pressing enter
      setHistory((prev) => [
        ...prev,
        {
          command: '',
          output: HELP_TEXT,
          timestamp: new Date(),
        },
      ])
      return
    }

    let output = ''

    // Handle local commands
    if (trimmedCommand === 'clear') {
      setHistory([])
      return
    } else if (trimmedCommand === 'help') {
      output = HELP_TEXT
    } else if (trimmedCommand === 'date') {
      output = new Date().toLocaleString()
    } else if (trimmedCommand === 'whoami') {
      output = 'web-user'
    } else if (trimmedCommand.startsWith('echo ')) {
      output = trimmedCommand.substring(5)
    } else if (trimmedCommand === 'ls') {
      output = 'bin  boot  dev  etc  home  lib  media  mnt  opt  proc  root  run  sbin  srv  sys  tmp  usr  var'
    } else if (trimmedCommand === 'pwd') {
      output = '/home/web-user'
    } else if (trimmedCommand === 'history') {
      // Fetch history from backend database
      try {
        const historyEndpoint = API_URL.startsWith('/') ? `${API_URL}/v1/history` : `${API_URL}/api/v1/history`
        const response = await axios.get(historyEndpoint, { params: { limit: 50 } })
        const backendHistory = response.data.history || []
        if (backendHistory.length > 0) {
          output = backendHistory.map((h: any, i: number) => 
            `${i + 1}  ${h.command} (${new Date(h.timestamp).toLocaleString()})`
          ).join('\n')
        } else {
          // Fallback to local history if backend has no entries
          output = history.map((h, i) => `${i + 1}  ${h.command}`).join('\n') || 'No history'
        }
      } catch (error: any) {
        // Fallback to local history on error
        output = history.map((h, i) => `${i + 1}  ${h.command}`).join('\n') || 'No history'
        console.error('Error fetching history from backend:', error)
      }
    } else if (trimmedCommand === 'neofetch') {
      output = NEOFETCH_OUTPUT
    } else if (trimmedCommand === 'about') {
      output = `Terminal Web Application
Built with Next.js, FastAPI, and PostgreSQL
Running on Kubernetes with ArgoCD
Version: 1.0.0`
    } else if (trimmedCommand === 'exit') {
      window.location.reload()
      return
    } else {
      // Try to execute on backend
      try {
        const apiEndpoint = API_URL.startsWith('/') ? `${API_URL}/v1/execute` : `${API_URL}/api/v1/execute`
        const response = await axios.post(apiEndpoint, {
          command: trimmedCommand,
        })
        output = response.data.output || response.data.error || 'Command executed'
      } catch (error: any) {
        output = `Error: ${error.response?.data?.detail || error.message || 'Unknown error'}`
      }
    }

    setHistory((prev) => [
      ...prev,
      {
        command: trimmedCommand,
        output,
        timestamp: new Date(),
      },
    ])
  }, [history])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      executeCommand(currentInput)
      setCurrentInput('')
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      const lastCommand = history.filter((h) => h.command).pop()?.command
      if (lastCommand) {
        setCurrentInput(lastCommand)
      }
    } else if (e.key === 'l' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      setHistory([])
    }
  }

  return (
    <div
      ref={terminalRef}
      style={{
        height: '100vh',
        width: '100vw',
        backgroundColor: '#300a24',
        color: '#ffffff',
        padding: '20px',
        fontFamily: "'Courier New', monospace",
        fontSize: '14px',
        overflowY: 'auto',
        overflowX: 'hidden',
      }}
      onClick={() => inputRef.current?.focus()}
    >
      {showLogo && isLoading && (
        <pre
          style={{
            color: '#00ff00',
            marginBottom: '20px',
            whiteSpace: 'pre',
            fontFamily: "'Courier New', monospace",
            lineHeight: '1.2',
            fontSize: '13px',
            userSelect: 'none',
            pointerEvents: 'none',
          }}
        >
          {NEOFETCH_OUTPUT}
        </pre>
      )}

      {history.map((item, index) => (
        <div key={index} style={{ marginBottom: '10px' }}>
          {item.command && (
            <div style={{ marginBottom: '5px' }}>
              <span style={{ color: '#00ff00' }}>web-user@terminal</span>
              <span style={{ color: '#ffffff' }}>:</span>
              <span style={{ color: '#00bfff' }}>~</span>
              <span style={{ color: '#ffffff' }}>$ </span>
              <span>{item.command}</span>
            </div>
          )}
          <div
            style={{
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              color: '#ffffff',
            }}
          >
            {item.output}
          </div>
        </div>
      ))}

      <div style={{ display: 'flex', alignItems: 'center' }}>
        <span style={{ color: '#00ff00' }}>web-user@terminal</span>
        <span style={{ color: '#ffffff' }}>:</span>
        <span style={{ color: '#00bfff' }}>~</span>
        <span style={{ color: '#ffffff' }}>$ </span>
        <div style={{ display: 'inline-flex', alignItems: 'center', marginLeft: '5px', position: 'relative' }}>
          <span style={{ color: '#ffffff', whiteSpace: 'pre', fontFamily: "'Courier New', monospace", fontSize: '14px' }}>
            {currentInput}
          </span>
          <span
            style={{
              display: 'inline-block',
              width: '8px',
              height: '16px',
              backgroundColor: showCursor ? '#ffffff' : 'transparent',
              marginLeft: '2px',
            }}
          />
          <input
            ref={inputRef}
            type="text"
            value={currentInput}
            onChange={(e) => setCurrentInput(e.target.value)}
            onKeyDown={handleKeyDown}
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: '100%',
              height: '100%',
              backgroundColor: 'transparent',
              border: 'none',
              outline: 'none',
              fontFamily: "'Courier New', monospace",
              fontSize: '14px',
              caretColor: 'transparent',
              color: 'transparent',
              textShadow: '0 0 0 transparent',
              padding: 0,
              margin: 0,
            }}
            autoFocus
          />
        </div>
      </div>
    </div>
  )
}

