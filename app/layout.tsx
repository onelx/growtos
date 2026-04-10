import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'GrowtOS - AI-Powered Marketing Campaigns',
  description: 'Transform your business idea into a complete, executable marketing campaign with AI agents',
  keywords: ['marketing', 'AI', 'campaigns', 'automation', 'growth'],
  authors: [{ name: 'GrowtOS' }],
  openGraph: {
    title: 'GrowtOS - AI-Powered Marketing Campaigns',
    description: 'Transform your business idea into a complete, executable marketing campaign with AI agents',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        {children}
      </body>
    </html>
  )
}
