import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string
)

export async function GET(
    request: Request,
    context: { params: { nmempresacurtovenda: string } }
) {
    try {
        const nmempresacurtovenda = decodeURIComponent(context.params.nmempresacurtovenda)
        console.log('API Request - Loja:', nmempresacurtovenda)

        const { data, error } = await supabase
            .from('vw_vendamesporpedido_geral2')
            .select(`
                cdpedido,
                nrdocumento,
                dtemissao,
                nmpessoa,
                nmrepresentantevenda,
                nmempresacurtovenda,
                tpmovimentooperacao,
                qtdsku,
                total_faturamento,
                total_custo_produto,
                margem
            `)
            .eq('nmempresacurtovenda', nmempresacurtovenda)
            .neq('tpmovimentooperacao', 'Saída')
            .order('dtemissao', { ascending: false })

        console.log('Supabase Query:', {
            table: 'vw_vendamesporpedido_geral2',
            filter: { nmempresacurtovenda },
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
            console.log('No data found for loja:', nmempresacurtovenda)
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