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

        // Fetch product details
        const { data: productData, error: productError } = await supabase
            .from('mvw_mssql_bivendas_aux_geral')
            .select('*')
            .eq('cdproduto', cdproduto)

        if (productError) throw productError

        // Fetch stock information
        const { data: stockData, error: stockError } = await supabase
            .from('DBestoque')
            .select('*')
            .eq('CdChamada', cdproduto)

        if (stockError) throw stockError

        return NextResponse.json({
            product: productData,
            stock: stockData
        })
    } catch (error) {
        console.error('Error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
} 