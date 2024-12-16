import { NextResponse } from 'next/server'
import { headers } from 'next/headers'

// Store active SSE connections
const clients = new Map<string, ReadableStreamDefaultController>()

// Helper function to create SSE response
function createSSEStream() {
    let controller: ReadableStreamDefaultController

    const stream = new ReadableStream({
        start(c) {
            controller = c
            const clientId = Date.now().toString()
            clients.set(clientId, controller)

            // Cleanup on close
            return () => {
                clients.delete(clientId)
            }
        },
        cancel() {
            // Handle client disconnect
            const clientId = Array.from(clients.entries())
                .find(([_, c]) => c === controller)?.[0]
            if (clientId) {
                clients.delete(clientId)
            }
        }
    })

    return stream
}

// GET endpoint for SSE connections
export async function GET() {
    const stream = createSSEStream()

    return new NextResponse(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*'
        }
    })
}

// POST endpoint for n8n to send updates
export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { step, totalSteps, stepName, workflowId } = body

        // Validate required fields
        if (typeof step === 'undefined') {
            return NextResponse.json(
                { error: 'Step number is required' },
                { status: 400 }
            )
        }

        // Create update data
        const updateData = {
            step,
            totalSteps,
            stepName,
            workflowId,
            timestamp: new Date().toISOString()
        }

        // Broadcast to all connected clients
        const encoder = new TextEncoder()
        const message = encoder.encode(`data: ${JSON.stringify(updateData)}\n\n`)
        
        clients.forEach(controller => {
            try {
                controller.enqueue(message)
            } catch (error) {
                console.error('Error sending to client:', error)
            }
        })

        return NextResponse.json({
            message: 'Progress updated successfully',
            connectedClients: clients.size
        })
    } catch (error) {
        console.error('Error processing progress update:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// OPTIONS for CORS
export async function OPTIONS() {
    return NextResponse.json(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        },
    })
} 