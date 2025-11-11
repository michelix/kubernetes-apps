import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Terminal',
  description: 'Web-based terminal emulator',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}

