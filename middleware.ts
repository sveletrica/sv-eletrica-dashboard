import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
    // Public paths that don't require authentication
    const publicPaths = ['/login']
    
    // Check if the current path is public
    if (publicPaths.includes(request.nextUrl.pathname)) {
        return NextResponse.next()
    }

    // Check if the user is authenticated via cookie
    const authCookie = request.cookies.get('auth')?.value
    
    if (!authCookie) {
        // Redirect to login page if not authenticated
        return NextResponse.redirect(new URL('/login', request.url))
    }

    return NextResponse.next()
}

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$).*)'],
} 