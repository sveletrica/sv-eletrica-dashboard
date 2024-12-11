import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { nanoid } from 'nanoid'
import { cookies } from 'next/headers'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string
)

export async function POST(request: Request) {
  try {
    // Get user from session
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('session')
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let user;
    try {
      user = JSON.parse(sessionCookie.value)
      console.log('Session user:', user) // Debug log
      
      if (!user?.email) {
        console.error('No email in session:', user)
        return NextResponse.json({ error: 'User email not found' }, { status: 400 })
      }
    } catch (error) {
      console.error('Error parsing session:', error)
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }

    const body = await request.json()
    const { cdpedidodevenda, discounts, notes } = body

    // Generate a unique share ID
    const share_id = nanoid(10)
    const created_at = new Date().toISOString()

    console.log('Saving simulation with email:', user.email) // Debug log

    const { data, error } = await supabase
      .from('discount_simulations')
      .insert({
        cdpedidodevenda,
        discounts,
        notes,
        created_by_email: user.email,
        created_at,
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