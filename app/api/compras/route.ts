import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

export async function GET(request: Request) {
    try {
        // Get the product code from the URL
        const { searchParams } = new URL(request.url)
        const codproduto = searchParams.get('codproduto')

        // If no product code is provided, return an error
        if (!codproduto) {
            return NextResponse.json({ error: 'Product code is required' }, { status: 400 })
        }

        // Query the purchase orders for the specified product
        const { data, error } = await supabase
            .from('mvw_mssql_pedidocompras')
            .select('dtemissao, nmcomprador, codpedido, qtemaberto, dtentrega, codproduto')
            .eq('codproduto', codproduto)
            .order('dtemissao', { ascending: false })

        if (error) throw error

        return NextResponse.json({ data })
    } catch (error) {
        console.error('Error fetching purchase orders data:', error)
        return NextResponse.json({ error: 'Failed to fetch purchase orders data' }, { status: 500 })
    }
}