import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string
)

export async function POST(request: NextRequest) {
  try {
    const { storeName } = await request.json()
    
    if (!storeName) {
      return NextResponse.json({ error: 'Nome da loja é obrigatório' }, { status: 400 })
    }
    
    console.log('API Request - Store Performance:', storeName)
    
    // Buscar dados da loja na view
    const { data, error } = await supabase
      .from('vw_vendedor_mes_atual')
      .select('*')
      .eq('nmempresacurtovenda', storeName)
    
    console.log('Supabase Query:', {
      table: 'vw_vendedor_mes_atual',
      filter: { storeName },
      resultCount: data?.length || 0
    })
    
    if (error) {
      console.error('Supabase Error:', {
        error,
        message: error.message,
        details: error.details,
        hint: error.hint
      })
      return NextResponse.json({ error: 'Erro ao buscar dados da loja' }, { status: 500 })
    }
    
    if (!data || data.length === 0) {
      console.log('No data found for store:', storeName)
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