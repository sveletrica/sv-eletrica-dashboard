import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string
)

type Props = {
    params: {
        nmpessoa: string
    }
}

export async function GET(
    request: NextRequest,
    { params }: Props
) {
    try {
        const nmpessoa = decodeURIComponent(params.nmpessoa)
        console.log('API Request - Client:', nmpessoa)

        const { data, error } = await supabase
            .from('mvw_mssql_bivendas_aux_geral')
            .select(`
                cdpedido,
                nrdocumento,
                dtemissao,
                tppessoa,
                nmpessoa,
                nmrepresentantevenda,
                nmempresacurtovenda,
                tpmovimentooperacao,
                qtbrutaproduto,
                vlfaturamento,
                vltotalcustoproduto,
                margem,
                cdproduto,
                nmproduto,
                nmgrupoproduto,
                dsunidadedenegocio
            `)
            .eq('nmpessoa', nmpessoa)
            .order('dtemissao', { ascending: false })

        if (error) {
            console.error('Supabase Error:', error)
            throw error
        }

        if (!data || data.length === 0) {
            console.log('No data found for client:', nmpessoa)
            return NextResponse.json([])
        }

        return NextResponse.json(data)
    } catch (error: any) {
        console.error('API Route Error:', {
            error,
            message: error.message,
            stack: error.stack,
            details: error.details
        })
        return NextResponse.json(
            { error: 'Internal Server Error', details: error.message },
            { status: 500 }
        )
    }
} 