import { NextResponse } from 'next/server'

export async function GET(
    request: Request,
    { params }: { params: { cdproduto: string } }
) {
    try {
        const url = `https://kinftxezwizaoyrcbfqc.supabase.co/rest/v1/DBEstoque?CdChamada=eq.${params.cdproduto}`
        console.log('Fetching from URL:', url)

        const response = await fetch(url, {
            headers: {
                'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY || '',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
            }
        })

        if (!response.ok) {
            const errorText = await response.text()
            console.error('Supabase response error:', {
                status: response.status,
                statusText: response.statusText,
                error: errorText
            })
            throw new Error(`Failed to fetch stock data: ${response.status} ${response.statusText}`)
        }

        const data = await response.json()
        console.log('Received data:', data)
        
        if (!data || data.length === 0) {
            console.log('No data found, returning zeros')
            return NextResponse.json({
                QtEstoque_Empresa1: 0,
                QtEstoque_Empresa4: 0,
                QtEstoque_Empresa12: 0,
                QtEstoque_Empresa13: 0,
                QtEstoque_Empresa15: 0,
                QtEstoque_Empresa17: 0,
                QtEstoque_Empresa59: 0,
                StkTotal: 0
            })
        }

        // Transform the data to match StockData interface
        const stockData = {
            QtEstoque_Empresa1: data[0].qtestoque_empresa1 || 0,
            QtEstoque_Empresa4: data[0].qtestoque_empresa4 || 0,
            QtEstoque_Empresa12: data[0].qtestoque_empresa12 || 0,
            QtEstoque_Empresa13: data[0].qtestoque_empresa13 || 0,
            QtEstoque_Empresa15: data[0].qtestoque_empresa15 || 0,
            QtEstoque_Empresa17: data[0].qtestoque_empresa17 || 0,
            QtEstoque_Empresa59: data[0].qtestoque_empresa59 || 0,
            StkTotal: data[0].sktotal || 0,
            NmProduto: data[0].nmproduto || '',
            NmGrupoProduto: data[0].nmgrupoproduto || '',
            NmFornecedorPrincipal: data[0].nmfornecedorprincipal || ''
        }

        return NextResponse.json(stockData)
    } catch (error) {
        console.error('Error in stock API:', error)
        return new NextResponse(
            JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), 
            { status: 500 }
        )
    }
} 