import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/auth/get-session`,
      {
        headers: {
          cookie: request.headers.get('cookie') || '',
        },
      },
    )

    if (res.ok) {
      const session = await res.json()
      if (session?.user) {
        return NextResponse.next()
      }
    }
  } catch {
    // API unreachable: redirect to sign-in
  }

  const signInUrl = new URL('/sign-in', request.url)
  signInUrl.searchParams.set('callbackUrl', pathname)
  return NextResponse.redirect(signInUrl)
}

export const config = {
  matcher: ['/dashboard/:path*'],
}
