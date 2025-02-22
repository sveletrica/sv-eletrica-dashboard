import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const query = searchParams.get('q')

        if (!query || query.length < 3) {
            return NextResponse.json([])
        }

        const { data, error } = await supabase
            .from('mvw_mssql_etiquetasio_estoques')
            .select('*')
            .or(`cdchamada.ilike.%${query}%,nmproduto.ilike.%${query}%`)
            .limit(10)

        if (error) throw error

        return NextResponse.json(data)
    } catch (error) {
        console.error('Error searching products:', error)
        return NextResponse.json({ error: 'Failed to search products' }, { status: 500 })
    }
} 