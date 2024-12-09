import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string
)

export async function GET() {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .order('name')

        if (error) throw error

        // Remove passwords from response
        const usersWithoutPasswords = data.map(({ password, ...user }) => user)

        return NextResponse.json(usersWithoutPasswords)
    } catch (error) {
        console.error('Error fetching users:', error)
        return NextResponse.json(
            { error: 'Failed to fetch users' },
            { status: 500 }
        )
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json()
        
        // Validate required fields
        if (!body.name || !body.email || !body.password) {
            return NextResponse.json(
                { error: 'Name, email and password are required' },
                { status: 400 }
            )
        }

        // Check if email already exists
        const { data: existingUser } = await supabase
            .from('users')
            .select('id')
            .eq('email', body.email)
            .single()

        if (existingUser) {
            return NextResponse.json(
                { error: 'Email already exists' },
                { status: 400 }
            )
        }

        // Hash the password before storing
        const hashedPassword = await bcrypt.hash(body.password, 10)
        console.log('Hashed password:', hashedPassword) // For debugging

        // Insert new user
        const { data, error } = await supabase
            .from('users')
            .insert([{
                name: body.name,
                email: body.email,
                password: hashedPassword,
                permissions: body.permissions
            }])
            .select()
            .single()

        if (error) {
            console.error('Error creating user:', error)
            throw error
        }

        // Remove password from response
        if (data) {
            const { password, ...userWithoutPassword } = data
            return NextResponse.json(userWithoutPassword)
        }

        throw new Error('Failed to create user')
    } catch (error) {
        console.error('Error creating user:', error)
        return NextResponse.json(
            { error: 'Failed to create user' },
            { status: 500 }
        )
    }
} 