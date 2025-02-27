import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string
)

export async function GET() {
  try {
    console.log('API Request - Fetching Branches')
    
    // Get distinct branches from the view
    const { data, error } = await supabase
      .from('vw_vendedor_mensal')
      .select('nmempresacurtovenda')
      .order('nmempresacurtovenda')
      
    if (error) {
      console.error('Supabase Error:', {
        error,
        message: error.message,
        details: error.details,
        hint: error.hint
      })
      return NextResponse.json({ error: 'Erro ao buscar filiais' }, { status: 500 })
    }
    
    if (!data || data.length === 0) {
      console.log('No branches found')
      return NextResponse.json([])
    }
    
    // Extract unique branch names
    const branches = [...new Set(data.map(item => item.nmempresacurtovenda))]
    
    console.log('Branches found:', branches)
    
    return NextResponse.json(branches)
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