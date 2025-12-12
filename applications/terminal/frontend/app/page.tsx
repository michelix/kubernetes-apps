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
                 ----                         web-user@terminal
        ===      ====      ===                ---------------
       ====      ====      ====               OS: Kubernetes 
        ====     ====     ====                Host: Terminal Web App
        +++++    ++++    +++++                Kernel: Next.js 14
+++      ++++    ++++    ++++      +++        Uptime: Just started
+++++     ++++   ++++   ++++     +++++        Packages: npm + pip
 +++++*   ++++   ++++   ++++   *+++++         Shell: web-terminal
   *****  *****  ****  *****  *****           Resolution: Browser
    *****  ****  ****  ****  *****            DE: Web Browser
     ****  ****  ****  ****  ****             WM: Not applicable
      ***  ****  ****  ****  ***              Theme: Dark
     ****  ****  ****  ****  ****             Icons: Terminal
    *****  ****  ****  ****  *****            Font: Courier New
   ****#  #****  ****  *****  #****#          CPU: Browser Engine
 #***##   #***   ***#   #***   ##***#         GPU: WebGL
#####     ####   ####   ####     #####        Memory: Dynamic
###      ####    ####    ####      ###                 
        #####    ####    #####                         
        ####     ####     ####                         
       ####      ####      ####                        
        ###      ####      ###                         
                 ####                                  
                                
Welcome to the Terminal
`

const HELP_TEXT = `Available commands:
  help               - Show this help message
  clear              - Clear the terminal
  date               - Show current date and time
  whoami             - Show current user
  echo <text>        - Echo text back
  ls                 - List files (simulated)
  pwd                - Print working directory
  history            - Show command history
  neofetch           - Display system information
  about              - Show information about this terminal
  weather [location] - Fetch weather information for a location
  exit               - Exit the terminal (reloads page)

Type a command and press Enter to execute.`

// Generate or retrieve session ID from localStorage
function getSessionId(): string {
  if (typeof window === 'undefined') return ''
  try {
    const stored = localStorage.getItem('terminal_session_id')
    if (stored) return stored
    // Generate a new session ID (UUID-like)
    const sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
    localStorage.setItem('terminal_session_id', sessionId)
    return sessionId
  } catch (error) {
    // If localStorage fails (e.g., quota exceeded), generate a session ID without storing it
    console.error('Error accessing localStorage for session ID:', error)
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
  }
}

export default function Terminal() {
  const [history, setHistory] = useState<CommandHistory[]>([])
  const [currentInput, setCurrentInput] = useState('')
  const [showCursor, setShowCursor] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [showLogo, setShowLogo] = useState(false)
  const [sessionId, setSessionId] = useState<string>('')
  const [displayStartIndex, setDisplayStartIndex] = useState(0)
  const [historyIndex, setHistoryIndex] = useState<number>(-1)
  const [backendVersion, setBackendVersion] = useState<string | null>(null)
  const terminalRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Initialize session ID on mount
  useEffect(() => {
    setSessionId(getSessionId())
  }, [])

  // Load history from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const stored = localStorage.getItem('terminal_history')
      if (stored) {
        const parsed = JSON.parse(stored) as { command: string; output: string; timestamp: string }[]
        setHistory(
          parsed.map((h) => ({
            command: h.command,
            output: h.output,
            timestamp: new Date(h.timestamp),
          }))
        )
      }
    } catch (error) {
      console.error('Error loading history from localStorage:', error)
    }
  }, [])

  // Fetch backend version from API root
  useEffect(() => {
    const fetchVersion = async () => {
      try {
        const response = await axios.get(API_URL)
        const version = response.data?.version
        if (version) {
          setBackendVersion(version)
        }
      } catch (error) {
        // Don't break the UI if version fetch fails
        console.error('Error fetching backend version:', error)
      }
    }

    fetchVersion()
  }, [])

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

  // Persist history to localStorage whenever it changes
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const serializable = history.map((h) => ({
        command: h.command,
        output: h.output,
        timestamp: h.timestamp instanceof Date ? h.timestamp.toISOString() : new Date(h.timestamp).toISOString(),
      }))
      localStorage.setItem('terminal_history', JSON.stringify(serializable))
    } catch (error) {
      console.error('Error saving history to localStorage:', error)
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
      setDisplayStartIndex(0)
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
      // Show history from local state (which is persisted in localStorage)
      const lines = history
        .filter((h) => h.command)
        .map((h, i) => `${i + 1}  ${h.command}`)
      output = lines.join('\n') || 'No history'
    } else if (trimmedCommand === 'neofetch') {
      // Show ASCII logo plus backend version (if available)
      const versionText = backendVersion ? `\nVersion: ${backendVersion}` : ''
      output = `${NEOFETCH_OUTPUT}${versionText}`
    } else if (trimmedCommand === 'about') {
      output = `Terminal Web Application
Built with Next.js, FastAPI, and PostgreSQL
Running on Kubernetes with ArgoCD
Version: ${backendVersion ?? 'unknown (backend version not available)'}` as string
    } else if (trimmedCommand === 'exit') {
      window.location.reload()
      return
    } else {
      // Try to execute on backend
      try {
        // Use sessionId from state, or get it from localStorage as fallback
        const effectiveSessionId = sessionId || (typeof window !== 'undefined' ? localStorage.getItem('terminal_session_id') || '' : '')
        const apiEndpoint = API_URL.startsWith('/') ? `${API_URL}/execute` : `${API_URL}/api/execute`
        const response = await axios.post(apiEndpoint, {
          command: trimmedCommand,
          session_id: effectiveSessionId,
        })
        output = response.data.output || response.data.error || 'Command executed'
      } catch (error: any) {
        // Handle different error types
        // Note: Backend sanitizes error messages in production to prevent information disclosure
        if (error.response) {
          // Backend returned an error response (400, 500, etc.)
          const status = error.response.status
          const detail = error.response.data?.detail
          
          if (status === 400 || status === 422) {
            // Validation error - show generic message (backend sanitizes details)
            output = `Error: ${detail || 'Invalid input provided'}`
          } else if (status === 500) {
            // Server error - show generic message
            output = `Error: ${detail || 'Internal server error'}`
          } else {
            // Other errors
            output = `Error: ${detail || 'An error occurred'}`
          }
        } else {
          // Network error or other issue
          output = `Error: ${error.message || 'Failed to connect to server'}`
        }
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
      setHistoryIndex(-1) // Reset history index after executing command
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      // Get all commands from history (filter out empty commands)
      const commands = history.filter((h) => h.command).map((h) => h.command)
      
      if (commands.length === 0) return
      
      // If at the start (index -1), start from the last command
      if (historyIndex === -1) {
        setHistoryIndex(commands.length - 1)
        setCurrentInput(commands[commands.length - 1])
      } else if (historyIndex > 0) {
        // Go to previous command
        const newIndex = historyIndex - 1
        setHistoryIndex(newIndex)
        setCurrentInput(commands[newIndex])
      }
      // If historyIndex === 0, stay at the first command
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      // Get all commands from history (filter out empty commands)
      const commands = history.filter((h) => h.command).map((h) => h.command)
      
      if (commands.length === 0 || historyIndex === -1) {
        // If at the end or no history, clear input
        setCurrentInput('')
        return
      }
      
      if (historyIndex < commands.length - 1) {
        // Go to next command
        const newIndex = historyIndex + 1
        setHistoryIndex(newIndex)
        setCurrentInput(commands[newIndex])
      } else {
        // At the end, clear input and reset index
        setCurrentInput('')
        setHistoryIndex(-1)
      }
    } else if (e.key === 'l' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      // Clear screen visually by hiding all current history, but keep history intact
      setDisplayStartIndex(history.length)
      // Scroll to bottom
      if (terminalRef.current) {
        terminalRef.current.scrollTop = terminalRef.current.scrollHeight
      }
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

      {history.slice(displayStartIndex).map((item, index) => (
        <div key={displayStartIndex + index} style={{ marginBottom: '10px' }}>
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

