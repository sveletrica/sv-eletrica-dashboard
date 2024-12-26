import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const cdChamada = searchParams.get('cdChamada')

        if (!cdChamada) {
            return NextResponse.json({ error: 'Missing cdChamada parameter' }, { status: 400 })
        }

        const { data, error } = await supabase
            .from('produtos_imagem')
            .select('imagem_url')
            .eq('cd_chamada', cdChamada)
            .limit(1)
            .single()

        if (error) {
            console.error('Supabase error:', error)
            return NextResponse.json({ error: 'Failed to fetch image' }, { status: 500 })
        }

        return NextResponse.json({ imageUrl: data?.imagem_url || null })
    } catch (error) {
        console.error('Error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
} 