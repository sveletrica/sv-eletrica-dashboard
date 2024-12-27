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

        // First try to get basic product info from DBestoque
        const { data: basicProductData, error: basicProductError } = await supabase
            .from('DBestoque')
            .select('CdChamada, NmProduto')
            .eq('CdChamada', cdproduto)
            .single()

        if (basicProductError && basicProductError.code === 'PGRST116') {
            return NextResponse.json(
                { error: 'Product not found' },
                { status: 404 }
            )
        }

        let productData = []

        // Only fetch sales data if we found the product in DBestoque
        if (basicProductData) {
            try {
                const { data: salesData, error: salesError } = await supabase
                    .from('mvw_mssql_bivendas_aux_geral')
                    .select('*')
                    .eq('cdproduto', cdproduto)
                    .limit(1000)
                    .timeout(15000)

                if (!salesError && salesData && salesData.length > 0) {
                    productData = salesData
                } else {
                    // If no sales data, create a minimal product record
                    productData = [{
                        cdproduto: basicProductData.CdChamada,
                        nmproduto: basicProductData.NmProduto,
                        nmgrupoproduto: '',
                        nmfornecedorprincipal: '',
                        dtemissao: new Date().toLocaleDateString('pt-BR'),
                        vlfaturamento: 0,
                        vltotalcustoproduto: 0,
                        margem: '0',
                        qtbrutaproduto: 0
                    }]
                }
            } catch (error) {
                console.error('Sales data fetch error:', error)
                // Continue with minimal product data if sales fetch fails
                productData = [{
                    cdproduto: basicProductData.CdChamada,
                    nmproduto: basicProductData.NmProduto,
                    nmgrupoproduto: '',
                    nmfornecedorprincipal: '',
                    dtemissao: new Date().toLocaleDateString('pt-BR'),
                    vlfaturamento: 0,
                    vltotalcustoproduto: 0,
                    margem: '0',
                    qtbrutaproduto: 0
                }]
            }
        }

        // Fetch stock information
        const { data: stockData, error: stockError } = await supabase
            .from('DBestoque')
            .select('*')
            .eq('CdChamada', cdproduto)

        if (stockError) {
            console.error('Stock fetch error:', stockError)
            // Continue without stock data
        }

        // Return the combined data
        return NextResponse.json({
            product: productData,
            stock: stockData || [],
            hasError: false
        })

    } catch (error) {
        console.error('API Route Error:', error)
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        
        return NextResponse.json({
            product: [],
            stock: [],
            hasError: true,
            error: 'Internal Server Error',
            details: errorMessage
        }, { status: 200 }) // Return 200 but with error flag
    }
} 