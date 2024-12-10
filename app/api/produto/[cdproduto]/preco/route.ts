import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string
)

export async function GET(
    request: Request,
    context: { params: { cdproduto: string } }
) {
    try {
        const cdproduto = await Promise.resolve(context.params.cdproduto)

        const { data: priceData, error: priceError } = await supabase
            .from('vw_preco_produto')
            .select('*')
            .eq('cdchamada', cdproduto)
            .single()

        if (priceError) throw priceError

        return NextResponse.json(priceData)
    } catch (error) {
        console.error('Error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
} 