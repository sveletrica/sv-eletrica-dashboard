import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string
)

export async function POST(request: Request) {
    try {
        const { email, password } = await request.json()
        console.log('Login attempt for email:', email) // For debugging

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
            console.error('User not found:', error)
            return NextResponse.json(
                { error: 'Invalid credentials' },
                { status: 401 }
            )
        }

        console.log('Found user:', { ...user, password: '[REDACTED]' }) // For debugging

        // Update the logging in the login route
        console.log('Login attempt:', {
            email,
            providedPassword: password,
            storedHash: user.password,
        })

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password)
        console.log('Password comparison:', { 
            providedPassword: password,
            storedHash: user.password,
            isValid: isValidPassword 
        })

        if (!isValidPassword) {
            console.error('Invalid password')
            return NextResponse.json(
                { error: 'Invalid credentials' },
                { status: 401 }
            )
        }

        // Remove password from response
        const { password: _, ...userWithoutPassword } = user

        // Set session cookie
        const cookieStore = cookies()
        cookieStore.set('session', JSON.stringify(userWithoutPassword), {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7, // 1 week
        })

        return NextResponse.json(userWithoutPassword)
    } catch (error) {
        console.error('Login error:', error)
        return NextResponse.json(
            { error: 'Failed to login' },
            { status: 500 }
        )
    }
} 