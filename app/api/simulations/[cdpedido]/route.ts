import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string
)

export async function GET(
  request: Request,
  { params }: { params: { cdpedido: string } }
) {
  try {
    const { data, error } = await supabase
      .from('discount_simulations')
      .select('*')
      .eq('cdpedidodevenda', params.cdpedido)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error loading simulations:', error)
    return NextResponse.json(
      { error: 'Failed to load simulations' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { cdpedido: string } }
) {
  try {
    const url = new URL(request.url)
    const id = url.searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Simulation ID is required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('discount_simulations')
      .delete()
      .eq('id', id)
      .eq('cdpedidodevenda', params.cdpedido)

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting simulation:', error)
    return NextResponse.json(
      { error: 'Failed to delete simulation' },
      { status: 500 }
    )
  }
} 