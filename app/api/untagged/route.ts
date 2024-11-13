import { NextResponse } from 'next/server'
import { WEBHOOKS, SUPABASE } from '@/lib/constants'

export async function GET() {
  try {
    const response = await fetch(`${WEBHOOKS.untaggedItems}?select=*`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'apikey': SUPABASE.apiKey || '',
        'Authorization': `Bearer ${SUPABASE.apiKey}`,
        'Prefer': 'return=representation'
      },
      cache: 'no-store',
    })

    if (!response.ok) {
      console.error('Supabase response error:', response.status, response.statusText)
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    
    return new NextResponse(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    })
  } catch (error) {
    console.error('Error fetching untagged items:', error)
    return new NextResponse(
      JSON.stringify({ 
        error: 'Failed to fetch untagged items data',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
} 