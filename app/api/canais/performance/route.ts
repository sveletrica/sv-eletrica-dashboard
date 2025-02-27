import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string
)

export async function GET(request: NextRequest) {
  try {
    console.log('API Request - Channel Performance')
    
    // Buscar dados dos canais na view
    const { data, error } = await supabase
      .from('vw_canal_mes_atual')
      .select('*')
    
    console.log('Supabase Query:', {
      table: 'vw_canal_mes_atual',
      resultCount: data?.length || 0
    })
    
    if (error) {
      console.error('Supabase Error:', {
        error,
        message: error.message,
        details: error.details,
        hint: error.hint
      })
      return NextResponse.json({ error: 'Erro ao buscar dados dos canais' }, { status: 500 })
    }
    
    if (!data || data.length === 0) {
      console.log('No data found for channels')
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