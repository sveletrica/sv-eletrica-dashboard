import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string
)

export async function POST(request: Request) {
    try {
        const { password } = await request.json()
        
        if (!password) {
            return NextResponse.json(
                { error: 'Password is required' },
                { status: 400 }
            )
        }

        // Get all users
        const { data: users, error: fetchError } = await supabase
            .from('users')
            .select('id')

        if (fetchError) throw fetchError

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10)
        console.log('New hashed password for all users:', hashedPassword)

        // Update all users
        const { error: updateError } = await supabase
            .from('users')
            .update({ password: hashedPassword })

        if (updateError) throw updateError

        return NextResponse.json({ 
            success: true,
            message: `Updated ${users?.length || 0} users`
        })
    } catch (error) {
        console.error('Error resetting passwords:', error)
        return NextResponse.json(
            { error: 'Failed to reset passwords' },
            { status: 500 }
        )
    }
} 