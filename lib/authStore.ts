import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { User, Session } from '@supabase/supabase-js'

interface AuthState {
  user: User | null
  session: Session | null
  setUser: (user: User | null) => void
  setSession: (session: Session | null) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      session: null,
      setUser: (user) => set({ user }),
      setSession: (session) => set({ session }),
      clearAuth: () => set({ user: null, session: null })
    }),
    {
      name: 'growtos-auth',
      partialize: (state) => ({
        user: state.user,
        session: state.session
      })
    }
  )
)
