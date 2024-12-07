import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string
)

interface ClientData {
    nmpessoa: string
    vlfaturamento: number
    nrpedidos: number
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const mode = searchParams.get('mode')

        if (mode === 'full') {
            // Fetch all clients with their data
            const { data, error } = await supabase
                .from('unique_nmpessoa_view')
                .select('nmpessoa, vlfaturamento, nrpedidos')
                .order('nmpessoa')

            if (error) throw error

            return NextResponse.json({
                items: data || [],
                total: data?.length || 0
            })
        } else {
            // Server-side search
            const query = searchParams.get('q') || ''
            const { data, error } = await supabase
                .from('unique_nmpessoa_view')
                .select('nmpessoa, vlfaturamento, nrpedidos')
                .ilike('nmpessoa', `%${query}%`)
                .limit(10)

            if (error) throw error

            return NextResponse.json({
                items: data || [],
                total: data?.length || 0
            })
        }
    } catch (error) {
        console.error('Error:', error)
        return NextResponse.json(
            { error: 'Failed to fetch clients' },
            { status: 500 }
        )
    }
}