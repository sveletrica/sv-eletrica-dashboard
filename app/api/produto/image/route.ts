import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-client'

const supabase = createAdminClient()

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const cdChamada = searchParams.get('cdChamada')

        if (!cdChamada) {
            return NextResponse.json({ error: 'Missing cdChamada parameter' }, { status: 400 })
        }

        // Use maybeSingle instead of single to avoid errors when no rows exist
        const { data, error } = await supabase
            .from('produtos_imagem')
            .select('imagem_url')
            .eq('cd_chamada', cdChamada)
            .limit(1)
            .maybeSingle()

        // Handle no rows case without error - just return null for imageUrl
        if (error && error.code !== 'PGRST116') {
            // Only log non-PGRST116 errors (real errors, not just "no rows")
            console.error('Supabase error:', error)
            return NextResponse.json({ error: 'Failed to fetch image' }, { status: 500 })
        }

        return NextResponse.json({ imageUrl: data?.imagem_url || null }, { status: 200 })
    } catch (error) {
        console.error('Error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
} 