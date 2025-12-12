// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

// Suppress React 19 act() warnings for async state updates in useEffect
// These are expected in tests and don't affect functionality
// Set up at module level to ensure it applies to all tests
const originalError = console.error
const filteredError = (...args) => {
  if (
    typeof args[0] === 'string' &&
    args[0].includes('An update to') &&
    args[0].includes('was not wrapped in act')
  ) {
    return
  }
  originalError.call(console, ...args)
}

// Override console.error immediately (not in hooks)
console.error = filteredError

// Mock window.location.reload
delete window.location
window.location = { reload: jest.fn() }

// Mock localStorage
const localStorageMock = (() => {
  let store = {}

  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => {
      store[key] = value.toString()
    },
    removeItem: (key) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

