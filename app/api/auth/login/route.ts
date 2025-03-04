import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase-client'

// Create a new admin client for this API route
const supabase = createAdminClient()

export async function POST(request: Request) {
    try {
        const { email, password } = await request.json()

        if (!email || !password) {
            return NextResponse.json(
                { error: 'Email and password are required' },
                { status: 400 }
            )
        }

        // Get user from database
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single()

        if (error || !user) {
            console.error('Login failed: Invalid credentials')
            return NextResponse.json(
                { error: 'Invalid credentials' },
                { status: 401 }
            )
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password)

        if (!isValidPassword) {
            console.error('Login failed: Invalid credentials')
            return NextResponse.json(
                { error: 'Invalid credentials' },
                { status: 401 }
            )
        }

        // Remove password from response
        const { password: _, ...userWithoutPassword } = user

        // Set session cookie
        const cookieStore = await cookies()
        await cookieStore.set('session', JSON.stringify(userWithoutPassword), {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7, // 1 week
        })

        return NextResponse.json(userWithoutPassword)
    } catch (error) {
        console.error('Login error occurred')
        return NextResponse.json(
            { error: 'Failed to login' },
            { status: 500 }
        )
    }
} 