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

        // Fetch product details
        const { data: productData, error: productError } = await supabase
            .from('mvw_mssql_bivendas_aux_geral')
            .select('*')
            .eq('cdproduto', cdproduto)

        if (productError) {
            console.error('Product fetch error:', productError)
            return NextResponse.json(
                { error: `Failed to fetch product data: ${productError.message}` },
                { status: 500 }
            )
        }

        if (!productData || productData.length === 0) {
            return NextResponse.json(
                { error: 'Product not found' },
                { status: 404 }
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