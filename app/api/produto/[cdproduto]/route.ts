import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string
)

export async function GET(
    request: Request,
    { params }: { params: { cdproduto: string } }
) {
    try {
        const { cdproduto } = params

        const { data, error } = await supabase
            .from('iosvendames')
            .select('*')
            .eq('cdproduto', cdproduto)

        if (error) throw error

        return NextResponse.json(data)
    } catch (error) {
        console.error('Error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
} 