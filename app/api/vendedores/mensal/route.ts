import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string
)

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const branch = searchParams.get('branch')
    const year = searchParams.get('year')
    const month = searchParams.get('month')
    
    console.log('API Request - Monthly Vendor Sales:', { branch, year, month })
    
    // Build query
    let query = supabase
      .from('vw_vendedor_mensal')
      .select('*')
    
    // Apply branch filter if provided
    if (branch && branch !== 'all') {
      query = query.eq('nmempresacurtovenda', branch)
    }
    
    // Apply year and month filters if provided
    if (year && year !== 'all' && month && month !== 'all') {
      // Filter by specific month and year (format: MM/YYYY)
      query = query.eq('mes_pedido', `${month}/${year}`)
    } else if (year && year !== 'all') {
      // Filter by year only
      query = query.ilike('mes_pedido', `%/${year}`)
    } else if (month && month !== 'all') {
      // Filter by month only (across all years)
      query = query.ilike('mes_pedido', `${month}/%`)
    }
    
    // Execute query
    const { data, error } = await query
    
    console.log('Supabase Query:', {
      table: 'vw_vendedor_mensal',
      filter: { branch, year, month },
      resultCount: data?.length || 0
    })
    
    if (error) {
      console.error('Supabase Error:', {
        error,
        message: error.message,
        details: error.details,
        hint: error.hint
      })
      return NextResponse.json({ error: 'Erro ao buscar dados de vendas' }, { status: 500 })
    }
    
    if (!data || data.length === 0) {
      console.log('No data found for monthly vendor sales')
      return NextResponse.json([])
    }
    
    // Clean up data to ensure no null values
    const cleanedData = data.map(item => ({
      nmrepresentantevenda: item.nmrepresentantevenda || '',
      nmempresacurtovenda: item.nmempresacurtovenda || '',
      mes_pedido: item.mes_pedido || '',
      vlfaturamento: item.vlfaturamento || 0,
      vltotalcustoproduto: item.vltotalcustoproduto || 0,
      margem: item.margem || '0%'
    }))
    
    console.log('Data found:', {
      count: cleanedData.length,
      firstRecord: cleanedData[0],
      lastRecord: cleanedData[cleanedData.length - 1]
    })
    
    return NextResponse.json(cleanedData)
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