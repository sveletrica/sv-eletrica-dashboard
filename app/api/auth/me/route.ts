import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET() {
    const cookieStore = await cookies()
    const sessionCookie = await cookieStore.get('session')
    
    if (!sessionCookie?.value) {
        return NextResponse.json(
            { error: 'Not authenticated' },
            { status: 401 }
        )
    }

    try {
        const session = JSON.parse(sessionCookie.value)
        return NextResponse.json(session)
    } catch (error) {
        return NextResponse.json(
            { error: 'Invalid session' },
            { status: 401 }
        )
    }
} 