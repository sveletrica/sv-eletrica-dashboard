import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { nanoid } from 'nanoid'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string
)

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { cdpedidodevenda, discounts, notes } = body

    // Generate a unique share ID
    const share_id = nanoid(10)
    const created_by = new Date().toISOString()

    const { data, error } = await supabase
      .from('discount_simulations')
      .insert({
        cdpedidodevenda,
        discounts,
        notes,
        created_by,
        share_id,
      })
      .select()

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Return the data with a shareable URL
    return NextResponse.json({
      ...data[0],
      shareUrl: `/orcamento/${cdpedidodevenda}?sim=${share_id}`
    })
  } catch (error) {
    console.error('Error saving simulation:', error)
    return NextResponse.json(
      { error: 'Failed to save simulation' },
      { status: 500 }
    )
  }
} 