import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { isRole, isUnit, canUseRetail } from '@/lib/enums'

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })

  const pathname = request.nextUrl.pathname
  const isPublic =
    pathname === '/' ||
    pathname === '/login' ||
    pathname === '/manifest.json' ||
    pathname.startsWith('/_next')

  if (isPublic) {
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
  const retailPath = pathname.startsWith('/pos') || pathname.startsWith('/inventory')
  if (retailPath && !canUseRetail(role, unit, retailEnabled)) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  if (
    role === 'Staff' &&
    (pathname.startsWith('/approvals') || pathname.startsWith('/reports') || pathname.startsWith('/reconciliations'))
  ) {
    return NextResponse.redirect(new URL('/dashboard/staff', request.url))
  }

  if (role !== 'Pimpinan' && role !== 'Superadmin' && pathname.startsWith('/reconciliations')) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  if (role !== 'Pimpinan' && role !== 'Superadmin' && role !== 'Manager' && pathname.startsWith('/users')) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
