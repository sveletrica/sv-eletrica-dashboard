import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams
        const startDate = searchParams.get('start')
        const endDate = searchParams.get('end')

        if (!startDate || !endDate) {
            return NextResponse.json({ error: 'Missing date parameters' }, { status: 400 })
        }

        const supabase = createClient()

        console.log('Fetching data for:', { startDate, endDate })

        const { data, error } = await supabase
            .from('vendas_dia')
            .select('dtemissao, nmempresacurtovenda, total_faturamento')
            .gte('dtemissao', startDate)
            .lte('dtemissao', endDate)
            .order('dtemissao', { ascending: true })

        if (error) {
            console.error('Supabase error:', error)
            throw error
        }

        if (!data || data.length === 0) {
            console.log('No data found for the period')
            return NextResponse.json([])
        }

        console.log(`Found ${data.length} records`)
        return NextResponse.json(data)
    } catch (error) {
        console.error('Error fetching monthly sales:', error)
        return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 })
    }
} 