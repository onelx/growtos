'use client'

import { useState, useEffect } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { getSupabaseClient } from '@/lib/supabase'
import { useAuthStore } from '@/lib/authStore'

interface UseAuthReturn {
  user: User | null
  session: Session | null
  isLoading: boolean
  error: string | null
  signInWithGoogle: () => Promise<void>
  signInWithEmail: (email: string) => Promise<void>
  signOut: () => Promise<void>
}

export function useAuth(): UseAuthReturn {
  const { user, session, setUser, setSession, clearAuth } = useAuthStore()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = getSupabaseClient()

    // Obtener sesión inicial
    const initializeAuth = async () => {
      try {
        setIsLoading(true)
        const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) throw sessionError

        if (currentSession) {
          setSession(currentSession)
          setUser(currentSession.user)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al inicializar autenticación')
      } finally {
        setIsLoading(false)
      }
    }

    initializeAuth()

    // Escuchar cambios de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (event === 'SIGNED_IN' && newSession) {
          setSession(newSession)
          setUser(newSession.user)
        } else if (event === 'SIGNED_OUT') {
          clearAuth()
        } else if (event === 'TOKEN_REFRESHED' && newSession) {
          setSession(newSession)
          setUser(newSession.user)
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [setUser, setSession, clearAuth])

  const signInWithGoogle = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const supabase = getSupabaseClient()
      
      const { error: signInError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/api/auth/callback`
        }
      })

      if (signInError) throw signInError
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión con Google')
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  const signInWithEmail = async (email: string) => {
    try {
      setIsLoading(true)
      setError(null)
      const supabase = getSupabaseClient()
      
      const { error: signInError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/api/auth/callback`
        }
      })

      if (signInError) throw signInError
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al enviar magic link')
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  const signOut = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const supabase = getSupabaseClient()
      
      const { error: signOutError } = await supabase.auth.signOut()
      
      if (signOutError) throw signOutError
      
      clearAuth()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cerrar sesión')
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  return {
    user,
    session,
    isLoading,
    error,
    signInWithGoogle,
    signInWithEmail,
    signOut
  }
}
