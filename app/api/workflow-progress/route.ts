import { NextResponse } from 'next/server'

// Store the latest progress update
let currentProgress = {
    step: 0,
    totalSteps: 5,
    stepName: "Aguardando início...",
    workflowId: "esl-update",
    timestamp: new Date().toISOString(),
    status: "waiting"
}

export async function GET() {
    return NextResponse.json(currentProgress, {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
    })
}

export async function POST(request: Request) {
    try {
        const data = await request.json()
        
        // Update the current progress
        currentProgress = {
            ...data,
            timestamp: new Date().toISOString()
        }

        return NextResponse.json({ 
            message: "Progress updated successfully",
            currentProgress 
        }, {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            }
        })
    } catch (error) {
        console.error('Error processing progress update:', error)
        return NextResponse.json(
            { error: 'Failed to process update' }, 
            { 
                status: 500,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                }
            }
        )
    }
}

export async function OPTIONS() {
    return new NextResponse(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
    })
} 