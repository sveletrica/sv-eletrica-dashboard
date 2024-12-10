import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const permissionMap = {
    '/inventory': 'inventory',
    '/produto': 'inventory',
    '/vendas-dia': 'sales',
    '/vendas-mes': 'sales',
    '/orcamento': 'quotations',
    '/cliente': 'clients',
    '/sobral': 'tags',
    '/maracanau': 'tags',
    '/caucaia': 'tags',
} as const

export function middleware(request: NextRequest) {
    const publicPaths = ['/login']
    const isPublicPath = publicPaths.includes(request.nextUrl.pathname)

    const session = request.cookies.get('session')?.value

    if (!session && !isPublicPath) {
        return NextResponse.redirect(new URL('/login', request.url))
    }

    if (session && isPublicPath) {
        return NextResponse.redirect(new URL('/', request.url))
    }

    if (session && !isPublicPath) {
        try {
            const user = JSON.parse(session)
            const requiredPermission = permissionMap[request.nextUrl.pathname as keyof typeof permissionMap]

            if (requiredPermission && !user.permissions[requiredPermission]) {
                return NextResponse.redirect(new URL('/', request.url))
            }
        } catch (error) {
            return NextResponse.redirect(new URL('/login', request.url))
        }
    }

    return NextResponse.next()
}

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico|logo.*|.*\\.svg).*)'],
} 