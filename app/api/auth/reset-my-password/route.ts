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
        const { currentPassword, newPassword } = await request.json()

        if (!currentPassword || !newPassword) {
            return NextResponse.json(
                { error: 'A senha atual e a nova senha são obrigatórias' },
                { status: 400 }
            )
        }

        // Get user from session
        const cookieStore = await cookies()
        const sessionCookie = cookieStore.get('session')
        if (!sessionCookie) {
            return NextResponse.json(
                { error: 'Não autenticado' },
                { status: 401 }
            )
        }

        const user = JSON.parse(sessionCookie.value)

        // Get user's current password hash from database
        const { data: userData, error: fetchError } = await supabase
            .from('users')
            .select('password')
            .eq('id', user.id)
            .single()

        if (fetchError || !userData) {
            return NextResponse.json(
                { error: 'Usuário não encontrado' },
                { status: 404 }
            )
        }

        // Verify current password
        const isValidPassword = await bcrypt.compare(currentPassword, userData.password)
        if (!isValidPassword) {
            return NextResponse.json(
                { error: 'A senha atual está incorreta' },
                { status: 401 }
            )
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10)

        // Update password
        const { error: updateError } = await supabase
            .from('users')
            .update({ password: hashedPassword })
            .eq('id', user.id)

        if (updateError) {
            throw updateError
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Erro ao resetar a senha:', error)
        return NextResponse.json(
            { error: 'Erro ao resetar a senha' },
            { status: 500 }
        )
    }
} 