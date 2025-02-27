import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string
)

export async function GET() {
  try {
    console.log('API Request - Fetching Available Years')
    
    // Get all mes_pedido values
    const { data, error } = await supabase
      .from('vw_vendedor_mensal')
      .select('mes_pedido')
      
    if (error) {
      console.error('Supabase Error:', {
        error,
        message: error.message,
        details: error.details,
        hint: error.hint
      })
      return NextResponse.json({ error: 'Erro ao buscar anos disponíveis' }, { status: 500 })
    }
    
    if (!data || data.length === 0) {
      console.log('No data found')
      return NextResponse.json([])
    }
    
    // Extract years from mes_pedido (format: MM/YYYY)
    const anos = new Set<string>()
    
    data.forEach(item => {
      if (item.mes_pedido) {
        const parts = item.mes_pedido.split('/')
        if (parts.length === 2) {
          anos.add(parts[1]) // Add the year part
        }
      }
    })
    
    // Convert to array and sort
    const anosArray = Array.from(anos)
    
    console.log('Years found:', anosArray)
    
    return NextResponse.json(anosArray)
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