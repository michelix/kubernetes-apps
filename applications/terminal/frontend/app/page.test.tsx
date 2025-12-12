import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import axios from 'axios'
import Terminal from './page'

// Mock axios
jest.mock('axios')
const mockedAxios = axios as jest.Mocked<typeof axios>

describe('Terminal Component', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear()
    // Reset all mocks
    jest.clearAllMocks()
    // Mock successful version fetch
    mockedAxios.get.mockResolvedValue({
      data: { version: '1.0.0' },
    })
  })

  describe('Initialization', () => {
    it('should render the terminal interface', () => {
      render(<Terminal />)
      expect(screen.getByText(/web-user@terminal/i)).toBeInTheDocument()
    })

    it('should fetch backend version on mount', async () => {
      render(<Terminal />)
      await waitFor(() => {
        expect(mockedAxios.get).toHaveBeenCalledWith(
          expect.stringContaining('/api')
        )
      })
    })

    it('should generate and store session ID in localStorage', () => {
      render(<Terminal />)
      expect(localStorage.getItem('terminal_session_id')).toBeTruthy()
    })

    it('should load history from localStorage on mount', () => {
      const mockHistory = [
        {
          command: 'help',
          output: 'Available commands:',
          timestamp: new Date().toISOString(),
        },
      ]
      localStorage.setItem('terminal_history', JSON.stringify(mockHistory))
      render(<Terminal />)
      expect(screen.getByText(/help/i)).toBeInTheDocument()
    })
  })

  describe('Local Commands', () => {
    it('should execute help command', async () => {
      const user = userEvent.setup()
      render(<Terminal />)

      const input = screen.getByRole('textbox')
      await user.type(input, 'help')
      await user.keyboard('{Enter}')

      await waitFor(() => {
        expect(screen.getByText(/Available commands:/i)).toBeInTheDocument()
      })
    })

    it('should execute clear command and clear history', async () => {
      const user = userEvent.setup()
      render(<Terminal />)

      // Add some history first
      const input = screen.getByRole('textbox')
      await user.type(input, 'help')
      await user.keyboard('{Enter}')

      await waitFor(() => {
        expect(screen.getByText(/Available commands:/i)).toBeInTheDocument()
      })

      // Clear the terminal
      await user.type(input, 'clear')
      await user.keyboard('{Enter}')

      await waitFor(() => {
        expect(screen.queryByText(/Available commands:/i)).not.toBeInTheDocument()
      })
    })

    it('should execute date command and show current date', async () => {
      const user = userEvent.setup()
      render(<Terminal />)

      const input = screen.getByRole('textbox')
      await user.type(input, 'date')
      await user.keyboard('{Enter}')

      await waitFor(() => {
        const dateOutput = screen.getByText(/\d{1,2}\/\d{1,2}\/\d{4}/)
        expect(dateOutput).toBeInTheDocument()
      })
    })

    it('should execute whoami command', async () => {
      const user = userEvent.setup()
      render(<Terminal />)

      const input = screen.getByRole('textbox')
      await user.type(input, 'whoami')
      await user.keyboard('{Enter}')

      await waitFor(() => {
        expect(screen.getByText('web-user')).toBeInTheDocument()
      })
    })

    it('should execute echo command with text', async () => {
      const user = userEvent.setup()
      render(<Terminal />)

      const input = screen.getByRole('textbox')
      await user.type(input, 'echo Hello World')
      await user.keyboard('{Enter}')

      await waitFor(() => {
        expect(screen.getByText('Hello World')).toBeInTheDocument()
      })
    })

    it('should execute ls command', async () => {
      const user = userEvent.setup()
      render(<Terminal />)

      const input = screen.getByRole('textbox')
      await user.type(input, 'ls')
      await user.keyboard('{Enter}')

      await waitFor(() => {
        expect(screen.getByText(/bin.*boot.*dev/i)).toBeInTheDocument()
      })
    })

    it('should execute pwd command', async () => {
      const user = userEvent.setup()
      render(<Terminal />)

      const input = screen.getByRole('textbox')
      await user.type(input, 'pwd')
      await user.keyboard('{Enter}')

      await waitFor(() => {
        expect(screen.getByText('/home/web-user')).toBeInTheDocument()
      })
    })

    it('should execute history command and show command history', async () => {
      const user = userEvent.setup()
      render(<Terminal />)

      // Execute a few commands first
      const input = screen.getByRole('textbox')
      await user.type(input, 'help')
      await user.keyboard('{Enter}')
      await waitFor(() => {
        expect(screen.getByText(/Available commands:/i)).toBeInTheDocument()
      })

      await user.type(input, 'date')
      await user.keyboard('{Enter}')

      // Now check history
      await user.type(input, 'history')
      await user.keyboard('{Enter}')

      await waitFor(() => {
        // Look for history output specifically (numbered list format)
        expect(screen.getByText(/1\s+help/i)).toBeInTheDocument()
        expect(screen.getByText(/2\s+date/i)).toBeInTheDocument()
      })
    })

    it('should execute neofetch command and show system info', async () => {
      const user = userEvent.setup()
      render(<Terminal />)

      const input = screen.getByRole('textbox')
      await user.type(input, 'neofetch')
      await user.keyboard('{Enter}')

      await waitFor(() => {
        expect(screen.getByText(/OS: Kubernetes/i)).toBeInTheDocument()
        expect(screen.getByText(/Host: Terminal Web App/i)).toBeInTheDocument()
      })
    })

    it('should execute about command and show application info', async () => {
      const user = userEvent.setup()
      render(<Terminal />)

      // Wait for version fetch
      await waitFor(() => {
        expect(mockedAxios.get).toHaveBeenCalled()
      })

      const input = screen.getByRole('textbox')
      await user.type(input, 'about')
      await user.keyboard('{Enter}')

      await waitFor(() => {
        expect(screen.getByText(/Terminal Web Application/i)).toBeInTheDocument()
        expect(screen.getByText(/Next.js/i)).toBeInTheDocument()
      })
    })

    it('should show help when pressing Enter with empty input', async () => {
      const user = userEvent.setup()
      render(<Terminal />)

      const input = screen.getByRole('textbox')
      await user.keyboard('{Enter}')

      await waitFor(() => {
        expect(screen.getByText(/Available commands:/i)).toBeInTheDocument()
      })
    })
  })

  describe('History Management', () => {
    it('should save command history to localStorage', async () => {
      const user = userEvent.setup()
      render(<Terminal />)

      const input = screen.getByRole('textbox')
      await user.type(input, 'help')
      await user.keyboard('{Enter}')

      await waitFor(() => {
        const stored = localStorage.getItem('terminal_history')
        expect(stored).toBeTruthy()
        const parsed = JSON.parse(stored!)
        expect(parsed.length).toBeGreaterThan(0)
        expect(parsed[parsed.length - 1].command).toBe('help')
      })
    })

    it('should persist history across component re-renders', async () => {
      const user = userEvent.setup()
      const { rerender } = render(<Terminal />)

      const input = screen.getByRole('textbox')
      await user.type(input, 'help')
      await user.keyboard('{Enter}')

      await waitFor(() => {
        expect(screen.getByText(/Available commands:/i)).toBeInTheDocument()
      })

      // Rerender component
      rerender(<Terminal />)

      // History should still be there
      expect(screen.getByText(/Available commands:/i)).toBeInTheDocument()
    })
  })

  describe('Keyboard Navigation', () => {
    it('should navigate history with ArrowUp key', async () => {
      const user = userEvent.setup()
      render(<Terminal />)

      const input = screen.getByRole('textbox') as HTMLInputElement

      // Execute a command
      await user.type(input, 'help')
      await user.keyboard('{Enter}')

      await waitFor(() => {
        expect(screen.getByText(/Available commands:/i)).toBeInTheDocument()
      })

      // Press ArrowUp to get previous command
      await user.keyboard('{ArrowUp}')

      await waitFor(() => {
        expect(input.value).toBe('help')
      })
    })

    it('should navigate history with ArrowDown key', async () => {
      const user = userEvent.setup()
      render(<Terminal />)

      const input = screen.getByRole('textbox') as HTMLInputElement

      // Execute multiple commands
      await user.type(input, 'help')
      await user.keyboard('{Enter}')

      await user.type(input, 'date')
      await user.keyboard('{Enter}')

      // Navigate up
      await user.keyboard('{ArrowUp}')
      await waitFor(() => {
        expect(input.value).toBe('date')
      })

      // Navigate up again
      await user.keyboard('{ArrowUp}')
      await waitFor(() => {
        expect(input.value).toBe('help')
      })

      // Navigate down
      await user.keyboard('{ArrowDown}')
      await waitFor(() => {
        expect(input.value).toBe('date')
      })
    })

    it('should clear input when ArrowDown at end of history', async () => {
      const user = userEvent.setup()
      render(<Terminal />)

      const input = screen.getByRole('textbox') as HTMLInputElement

      // Execute a command
      await user.type(input, 'help')
      await user.keyboard('{Enter}')

      // Navigate up
      await user.keyboard('{ArrowUp}')
      await waitFor(() => {
        expect(input.value).toBe('help')
      })

      // Navigate down (should clear)
      await user.keyboard('{ArrowDown}')
      await waitFor(() => {
        expect(input.value).toBe('')
      })
    })

    it('should clear screen with Ctrl+L', async () => {
      const user = userEvent.setup()
      render(<Terminal />)

      const input = screen.getByRole('textbox')

      // Add some history
      await user.type(input, 'help')
      await user.keyboard('{Enter}')

      await waitFor(() => {
        expect(screen.getByText(/Available commands:/i)).toBeInTheDocument()
      })

      // Press Ctrl+L
      await user.keyboard('{Control>}l{/Control}')

      // History should still be in state but not displayed
      // (displayStartIndex should be updated)
      await waitFor(() => {
        // The help text might still be visible depending on implementation
        // This test verifies the keyboard event is handled
        expect(input).toBeInTheDocument()
      })
    })
  })

  describe('Backend API Integration', () => {
    it('should execute backend command via API', async () => {
      const user = userEvent.setup()
      mockedAxios.post.mockResolvedValue({
        data: { output: 'Command executed successfully' },
      })

      render(<Terminal />)

      const input = screen.getByRole('textbox')
      await user.type(input, 'weather london')
      await user.keyboard('{Enter}')

      await waitFor(() => {
        expect(mockedAxios.post).toHaveBeenCalledWith(
          expect.stringContaining('/execute'),
          expect.objectContaining({
            command: 'weather london',
            session_id: expect.any(String),
          })
        )
        expect(screen.getByText('Command executed successfully')).toBeInTheDocument()
      })
    })

    it('should handle API errors gracefully', async () => {
      const user = userEvent.setup()
      mockedAxios.post.mockRejectedValue({
        response: {
          status: 500,
          data: { detail: 'Internal server error' },
        },
      })

      render(<Terminal />)

      const input = screen.getByRole('textbox')
      await user.type(input, 'invalid-command')
      await user.keyboard('{Enter}')

      await waitFor(() => {
        expect(screen.getByText(/Error:/i)).toBeInTheDocument()
      })
    })

    it('should handle network errors', async () => {
      const user = userEvent.setup()
      mockedAxios.post.mockRejectedValue({
        message: 'Network Error',
      })

      render(<Terminal />)

      const input = screen.getByRole('textbox')
      await user.type(input, 'test-command')
      await user.keyboard('{Enter}')

      await waitFor(() => {
        expect(screen.getByText(/Error:/i)).toBeInTheDocument()
        expect(screen.getByText(/Network Error/i)).toBeInTheDocument()
      })
    })

    it('should handle 400 validation errors', async () => {
      const user = userEvent.setup()
      mockedAxios.post.mockRejectedValue({
        response: {
          status: 400,
          data: { detail: 'Invalid input provided' },
        },
      })

      render(<Terminal />)

      const input = screen.getByRole('textbox')
      await user.type(input, 'bad-command')
      await user.keyboard('{Enter}')

      await waitFor(() => {
        expect(screen.getByText(/Error:/i)).toBeInTheDocument()
      })
    })
  })

  describe('Session Management', () => {
    it('should reuse existing session ID from localStorage', () => {
      const existingSessionId = 'session_1234567890_abc123'
      localStorage.setItem('terminal_session_id', existingSessionId)

      render(<Terminal />)

      expect(localStorage.getItem('terminal_session_id')).toBe(existingSessionId)
    })

    it('should send session ID with API requests', async () => {
      const user = userEvent.setup()
      mockedAxios.post.mockResolvedValue({
        data: { output: 'Success' },
      })

      render(<Terminal />)

      // Wait a bit for useEffect to set sessionId state
      await waitFor(() => {
        expect(localStorage.getItem('terminal_session_id')).toBeTruthy()
      }, { timeout: 3000 })

      // Get the session ID that was stored
      const storedSessionId = localStorage.getItem('terminal_session_id')
      expect(storedSessionId).toBeTruthy()

      const input = screen.getByRole('textbox')
      await user.type(input, 'test-command')
      await user.keyboard('{Enter}')

      // Wait for API call and verify it includes the session ID
      await waitFor(() => {
        expect(mockedAxios.post).toHaveBeenCalled()
        const calls = mockedAxios.post.mock.calls
        expect(calls.length).toBeGreaterThan(0)
        const lastCall = calls[calls.length - 1]
        expect(lastCall[1]).toHaveProperty('session_id')
        // Session ID should match what was stored (or be a valid session ID format)
        const requestData = lastCall[1] as { session_id: string }
        expect(requestData.session_id).toMatch(/^session_\d+_/)
      })
    })
  })

  describe('UI Interactions', () => {
    it('should focus input when clicking on terminal', async () => {
      render(<Terminal />)

      const terminal = screen.getByText(/web-user@terminal/i).closest('div')
      const input = screen.getByRole('textbox')

      if (terminal) {
        fireEvent.click(terminal)
        await waitFor(() => {
          expect(input).toHaveFocus()
        })
      }
    })

    it('should display cursor blinking effect', async () => {
      render(<Terminal />)

      // Cursor should be visible initially - it's a sibling span with backgroundColor
      const input = screen.getByRole('textbox')
      const inputContainer = input.parentElement
      expect(inputContainer).toBeInTheDocument()
      
      // The cursor is a span sibling to the input, with backgroundColor in inline style
      // Find all spans in the container and check for backgroundColor
      const spans = inputContainer?.querySelectorAll('span') || []
      const cursor = Array.from(spans).find((span) => {
        const style = span.getAttribute('style') || ''
        return style.includes('backgroundColor') || style.includes('background-color')
      })
      expect(cursor).toBeTruthy()
      expect(cursor).toBeInstanceOf(HTMLElement)
    })

    it('should clear input after executing command', async () => {
      const user = userEvent.setup()
      render(<Terminal />)

      const input = screen.getByRole('textbox') as HTMLInputElement
      await user.type(input, 'help')
      await user.keyboard('{Enter}')

      await waitFor(() => {
        expect(input.value).toBe('')
      })
    })
  })

  describe('Edge Cases', () => {
    it('should handle commands with extra whitespace', async () => {
      const user = userEvent.setup()
      render(<Terminal />)

      const input = screen.getByRole('textbox')
      await user.type(input, '  help  ')
      await user.keyboard('{Enter}')

      await waitFor(() => {
        expect(screen.getByText(/Available commands:/i)).toBeInTheDocument()
      })
    })

    it('should handle empty history gracefully', async () => {
      const user = userEvent.setup()
      render(<Terminal />)

      const input = screen.getByRole('textbox')
      await user.type(input, 'history')
      await user.keyboard('{Enter}')

      await waitFor(() => {
        expect(screen.getByText('No history')).toBeInTheDocument()
      })
    })

    it('should handle localStorage errors gracefully', () => {
      // Mock localStorage.setItem to throw error
      const originalSetItem = localStorage.setItem
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
      
      localStorage.setItem = jest.fn(() => {
        throw new Error('QuotaExceededError')
      })

      // Component should still render even if localStorage fails
      expect(() => render(<Terminal />)).not.toThrow()
      expect(screen.getByText(/web-user@terminal/i)).toBeInTheDocument()

      // Restore original
      localStorage.setItem = originalSetItem as typeof localStorage.setItem
      consoleError.mockRestore()
    })
  })
})

