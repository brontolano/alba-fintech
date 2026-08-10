import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { isRole, isUnit, canUseRetail } from '@/lib/enums'

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })

  // Public paths
  const publicPaths = ['/login', '/', '/manifest.json', '/_next']
  if (publicPaths.some((p) => request.nextUrl.pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // Not authenticated
  if (!token?.id) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const role = token.role as string
  const unit = token.unit as string
  const retailEnabled = (token as { retailModuleEnabled?: boolean })?.retailModuleEnabled === true

  // Role guard
  if (!isRole(role) || !isUnit(unit)) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Retail module guard
  if (request.nextUrl.pathname.startsWith('/pos') && !canUseRetail(role, retailEnabled)) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
