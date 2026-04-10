import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const token_hash = requestUrl.searchParams.get('token_hash')
  const type = requestUrl.searchParams.get('type')

  const response = NextResponse.redirect(new URL('/dashboard', requestUrl.origin))

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: object }[]) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options as any)
          )
        },
      },
    }
  )

  try {
    if (code) {
      // Magic link / OAuth PKCE flow
      await supabase.auth.exchangeCodeForSession(code)
    } else if (token_hash && type) {
      // Email confirmation / invite flow
      const { error } = await supabase.auth.verifyOtp({ token_hash, type: type as any })
      if (error) throw error
    } else {
      return NextResponse.redirect(new URL('/login?error=missing_params', requestUrl.origin))
    }
  } catch (error) {
    console.error('Auth callback error:', error)
    return NextResponse.redirect(new URL('/login?error=auth_failed', requestUrl.origin))
  }

  return response
}
