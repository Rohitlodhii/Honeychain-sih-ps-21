import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'HoneyChain - Honey Traceability & Beekeeping',
  description: 'Blockchain-based honey traceability with smart beekeeping management for KVIC',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-espresso text-cream font-sans">
        {children}
      </body>
    </html>
  )
}
