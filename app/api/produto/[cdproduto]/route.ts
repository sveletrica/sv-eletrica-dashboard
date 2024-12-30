import { supabase } from '@/lib/supabase-client'
import { NextResponse } from 'next/server'

export async function GET(
    request: Request,
    context: { params: { cdproduto: string } }
) {
    try {
        const cdproduto = context.params.cdproduto

        if (!cdproduto) {
            return NextResponse.json(
                { error: 'Product code is required' },
                { status: 400 }
            )
        }

        // Fetch product/sales data
        const { data: salesData, error: salesError } = await supabase
            .from('mvw_mssql_bivendas_aux_geral')
            .select('*')
            .eq('cdproduto', cdproduto)

        if (salesError) {
            console.error('Sales fetch error:', salesError)
            return NextResponse.json(
                { error: `Failed to fetch sales data: ${salesError.message}` },
                { status: 500 }
            )
        }

        // Fetch stock information
        const { data: stockData, error: stockError } = await supabase
            .from('DBestoque')
            .select('*')
            .eq('CdChamada', cdproduto)

        if (stockError) {
            console.error('Stock fetch error:', stockError)
            return NextResponse.json(
                { error: `Failed to fetch stock data: ${stockError.message}` },
                { status: 500 }
            )
        }

        // If no sales data found, create a minimal product record
        const productData = salesData?.length ? salesData : [{
            cdproduto: cdproduto,
            nmproduto: "Produto sem vendas",
            nmgrupoproduto: "-",
            nmfornecedorprincipal: "-",
            qtbrutaproduto: 0,
            vlfaturamento: 0,
            vltotalcustoproduto: 0,
            margem: "0%",
            dtemissao: new Date().toLocaleDateString('pt-BR'),
            nmempresacurtovenda: "-",
            nmpessoa: "-",
            tppessoa: "-",
            cdpedido: "-",
            nrdocumento: "-"
        }]

        // Return the combined data
        return NextResponse.json({
            product: productData,
            stock: stockData || []
        })

    } catch (error) {
        console.error('API Route Error:', error)
        return NextResponse.json(
            {
                error: 'Internal Server Error',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        )
    }
} 