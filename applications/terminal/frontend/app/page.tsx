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

const ASCII_LOGO = `
    ███╗   ██╗███████╗████████╗
    ████╗  ██║██╔════╝╚══██╔══╝
    ██╔██╗ ██║█████╗     ██║   
    ██║╚██╗██║██╔══╝     ██║   
    ██║ ╚████║███████╗   ██║   
    ╚═╝  ╚═══╝╚══════╝   ╚═╝   
                                
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
  about         - Show information about this terminal
  exit          - Exit the terminal (reloads page)

Type a command and press Enter to execute.`

export default function Terminal() {
  const [history, setHistory] = useState<CommandHistory[]>([])
  const [currentInput, setCurrentInput] = useState('')
  const [showCursor, setShowCursor] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const [showLogo, setShowLogo] = useState(true)
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

  // Hide logo after 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowLogo(false)
      setIsLoading(false)
    }, 3000)
    return () => clearTimeout(timer)
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
      output = history.map((h, i) => `${i + 1}  ${h.command}`).join('\n') || 'No history'
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
        const apiEndpoint = API_URL.startsWith('/') ? `${API_URL}/execute` : `${API_URL}/api/execute`
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
          }}
        >
          {ASCII_LOGO}
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
        <input
          ref={inputRef}
          type="text"
          value={currentInput}
          onChange={(e) => setCurrentInput(e.target.value)}
          onKeyDown={handleKeyDown}
          style={{
            flex: 1,
            backgroundColor: 'transparent',
            border: 'none',
            outline: 'none',
            color: '#ffffff',
            fontFamily: "'Courier New', monospace",
            fontSize: '14px',
            marginLeft: '5px',
          }}
          autoFocus
        />
        <span
          style={{
            display: 'inline-block',
            width: '8px',
            height: '16px',
            backgroundColor: showCursor ? '#ffffff' : 'transparent',
            marginLeft: '2px',
          }}
        />
      </div>
    </div>
  )
}

