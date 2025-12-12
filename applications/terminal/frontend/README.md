# Terminal Frontend

Built with Next.js 15, React 19, TypeScript, and ESLint 9.

## Quick Start

```bash
# Install dependencies using package-lock.json (secure, reproducible)
npm ci

# Run development server
npm run dev

# Run tests
npm test

# Run tests with coverage (generates coverage/ directory)
npm run test:coverage

# View coverage HTML report (after running test:coverage above)
# Open in browser: coverage/lcov-report/index.html
# Or use: open coverage/lcov-report/index.html (Mac) or xdg-open (Linux)

# Run linter
npm run lint
```

## Security

**Always use `npm ci`** (not `npm install`) to prevent supply chain attacks:
- Uses exact versions from `package-lock.json` (no version drift)
- Fails if `package-lock.json` is missing or out of sync
- Ensures reproducible builds across environments
- Prevents malicious package updates during installation

**Note:** If you need to update dependencies, use `npm install` to update `package-lock.json`, then commit the changes. For all other cases (CI/CD, local development, production builds), use `npm ci`.

## Test Coverage

33 tests covering component initialization, commands, history, keyboard navigation, API integration, and error handling.

## Structure

```
frontend/
├── app/
│   ├── page.tsx        # Main terminal component
│   ├── page.test.tsx   # Component tests (33 tests)
│   ├── layout.tsx      # Layout component
│   └── globals.css     # Global styles
├── jest.config.js      # Jest configuration
├── jest.setup.js       # Test setup (suppresses React 19 act() warnings)
├── jest.d.ts          # TypeScript declarations for jest-dom
├── package.json        # Dependencies (Next.js 15, React 19, ESLint 9)
├── package-lock.json   # Locked dependency versions (for npm ci)
└── README.md          # This file
```
