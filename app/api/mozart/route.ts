import { NextResponse } from 'next/server'
import { SUPABASE_URL } from '@/lib/constants'

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not defined')
}

export async function GET() {
    try {
        const url = `${SUPABASE_URL}/rest/v1/apimozart`
        if (!url) {
            throw new Error('Supabase URL is not configured')
        }

        console.log('Fetching from URL:', `${url}?select=*`) // Debug log

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
            const errorText = await response.text()
            console.error('Supabase error response:', {
                status: response.status,
                statusText: response.statusText,
                body: errorText
            })
            throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data = await response.json()
        
        if (!Array.isArray(data) || data.length === 0) {
            throw new Error('Invalid or empty data received from Supabase')
        }

        return NextResponse.json(data, {
            status: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            },
        })
    } catch (error) {
        console.error('Error fetching Mozart data:', error)
        return NextResponse.json({ 
            error: 'Failed to fetch Mozart data',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { 
            status: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
            },
        })
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