import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string
)

export async function GET(
    request: Request,
    context: { params: { nmpessoa: string } }
) {
    try {
        const nmpessoa = decodeURIComponent(context.params.nmpessoa)
        console.log('API Request - Client:', nmpessoa)

        const { data, error } = await supabase
            .from('vw_mssql_bivendas_aux_geral')
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

        console.log('Supabase Query:', {
            table: 'vw_mssql_bivendas_aux_geral',
            filter: { nmpessoa },
            resultCount: data?.length || 0
        })

        if (error) {
            console.error('Supabase Error:', {
                error,
                message: error.message,
                details: error.details,
                hint: error.hint
            })
            throw error
        }

        if (!data || data.length === 0) {
            console.log('No data found for client:', nmpessoa)
            return NextResponse.json([])
        }

        console.log('Data found:', {
            count: data.length,
            firstRecord: data[0],
            lastRecord: data[data.length - 1]
        })

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