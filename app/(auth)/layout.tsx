import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import '../globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'GrowtOS - Autenticación',
  description: 'Transformá tu idea en una campaña de marketing completa',
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className={`${inter.className} min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50`}>
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
              GrowtOS
            </h1>
            <p className="text-gray-600">
              Tu equipo de marketing impulsado por IA
            </p>
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}
