import { NextResponse } from 'next/server'
import { SUPABASE_URL } from '@/lib/constants'

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not defined')
}

export async function GET() {
    try {
        const url = `${SUPABASE_URL}/rest/v1/itenssemetiquetas_maracanau`
        const response = await fetch(`${url}?select=*`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
                'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
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