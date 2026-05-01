import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  // Create a response to pass cookies through
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            response = NextResponse.next({ request })
            response.cookies.set(name, value, options)
          })
        },
      },
    },
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()
  const path = request.nextUrl.pathname

  // /tech/* routes: must be authenticated technician
  if (path.startsWith('/tech') && !path.startsWith('/tech/login')) {
    if (!user) return NextResponse.redirect(new URL('/tech/login', request.url))
    const { data } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()
    if (!data || data.role !== 'technician') {
      return NextResponse.redirect(new URL('/tech/login', request.url))
    }
  }

  // /admin/* routes: must be admin
  if (path.startsWith('/admin')) {
    if (!user) return NextResponse.redirect(new URL('/login', request.url))
    const { data } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()
    if (!data || data.role !== 'admin') {
      return NextResponse.redirect(new URL('/dispatch', request.url))
    }
  }

  // /dispatch/* routes: must be dispatcher or admin
  if (path.startsWith('/dispatch')) {
    if (!user) return NextResponse.redirect(new URL('/login', request.url))
    const { data } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()
    if (!data || !['dispatcher', 'admin'].includes(data.role)) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  // /invoice/* routes: must be dispatcher or admin
  if (path.startsWith('/invoice')) {
    if (!user) return NextResponse.redirect(new URL('/login', request.url))
    const { data } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()
    if (!data || !['dispatcher', 'admin'].includes(data.role)) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  return response
}

export const config = {
  matcher: ['/tech/:path*', '/admin/:path*', '/dispatch/:path*', '/invoice/:path*'],
}
