import { NextResponse } from 'next/server'
import { SUPABASE_URL } from '@/lib/constants'

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not defined')
}

export async function GET(
    request: Request,
    context: { params: Promise<{ cdpedido: string }> }
) {
    try {
        const { cdpedido } = await context.params
        const url = new URL(request.url)
        const nrdocumento = url.searchParams.get('nrdocumento')
        
        if (!nrdocumento) {
            throw new Error('nrdocumento is required')
        }

        const baseUrl = `${SUPABASE_URL}/rest/v1/iosvendadia`
        const queryUrl = `${baseUrl}?cdpedido=eq.${cdpedido}&nrdocumento=eq.${nrdocumento}`
        
        const response = await fetch(queryUrl, {
            method: 'GET',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                apikey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
                Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
                Prefer: 'return=representation'
            },
            cache: 'no-store',
        })

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data = await response.json()
        
        return NextResponse.json(data, {
            status: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            },
        })
    } catch (error) {
        console.error('Failed to fetch sale details:', error)
        return NextResponse.json(
            { error: 'Failed to fetch sale details' },
            { status: 500 }
        )
    }
} 