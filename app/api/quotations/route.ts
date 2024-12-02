import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    try {
        const quotation = await request.json()
        
        // Here you would typically save to your database
        // For now, we'll just return success
        
        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Failed to save quotation:', error)
        return NextResponse.json(
            { error: 'Failed to save quotation' },
            { status: 500 }
        )
    }
} 