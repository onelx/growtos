'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { useCredits } from '@/hooks/useCredits'
import { CreditsBadge } from '@/components/CreditsBadge'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, isLoading: loading, signOut } = useAuth()
  const { balance: credits } = useCredits()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-black">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-orange" />
      </div>
    )
  }

  if (!user) return null

  const navigation = [
    {
      name: 'Inicio',
      href: '/dashboard',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      name: 'Nueva campaña',
      href: '/campaigns/new',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
      ),
    },
    {
      name: 'Agentes IA',
      href: '#',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1 1 .03 2.698-1.338 2.698H4.136c-1.368 0-2.338-1.698-1.338-2.698L4 15.302" />
        </svg>
      ),
      badge: null as number | null,
    },
    {
      name: 'Perfil',
      href: '/profile',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
        </svg>
      ),
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50 flex">

      {/* ── Sidebar ── */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 flex flex-col transform transition-transform duration-200
          bg-brand-black
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 lg:static lg:inset-auto lg:z-auto`}
      >
        {/* Logo */}
        <div className="px-6 py-7 flex-shrink-0">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-brand-orange to-brand-orangeLight bg-clip-text text-transparent tracking-tight">
            GrowtOS
          </h1>
          <p className="text-xs text-gray-500 mt-0.5 font-medium">Marketing con IA</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = pathname === item.href || (item.href !== '#' && pathname?.startsWith(item.href) && item.href !== '/dashboard') || pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3.5 px-4 py-3.5 rounded-2xl transition-all duration-150 group ${
                  isActive
                    ? 'bg-brand-orange text-white font-semibold shadow-sm'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <span className={`flex-shrink-0 transition-colors ${isActive ? 'text-white' : 'text-gray-500 group-hover:text-gray-200'}`}>
                  {item.icon}
                </span>
                <span className="text-sm">{item.name}</span>
                {item.badge != null && (
                  <span className="ml-auto w-5 h-5 rounded-full bg-brand-orange text-white text-[10px] font-bold flex items-center justify-center">
                    {item.badge}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* User info */}
        <div className="px-4 py-5 flex-shrink-0 border-t border-white/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-brand-orange flex items-center justify-center flex-shrink-0">
              <span className="text-white text-sm font-bold">
                {user.email?.[0].toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user.email}</p>
              <p className="text-xs text-gray-500">Plan Free</p>
            </div>
          </div>
          <button
            onClick={() => signOut()}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-gray-500 hover:text-red-400 hover:bg-white/5 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
            </svg>
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* ── Main area ── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-40 flex-shrink-0">
          <div className="px-4 sm:px-6 py-3 flex items-center justify-between">
            {/* Mobile burger */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 rounded-xl hover:bg-gray-100 text-gray-500"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="flex items-center gap-3 ml-auto">
              <CreditsBadge credits={credits} />
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">{children}</main>
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  )
}
