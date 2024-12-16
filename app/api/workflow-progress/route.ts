import { NextResponse } from 'next/server'

const clients = new Set<ReadableStreamDefaultController>()

export async function GET() {
    const stream = new ReadableStream({
        start(controller) {
            clients.add(controller)

            // Send initial message
            const initialData = {
                step: 0,
                totalSteps: 5,
                stepName: "Iniciando...",
                workflowId: "esl-update",
                timestamp: new Date().toISOString(),
                status: "in_progress"
            }
            
            controller.enqueue(`data: ${JSON.stringify(initialData)}\n\n`)
        },
        cancel() {
            clients.delete(controller)
        }
    })

    return new NextResponse(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        },
    })
}

export async function POST(request: Request) {
    try {
        const data = await request.json()
        
        // Broadcast to all connected clients
        clients.forEach(client => {
            client.enqueue(`data: ${JSON.stringify(data)}\n\n`)
        })

        return NextResponse.json({ 
            message: "Progress updated successfully",
            connectedClients: clients.size 
        })
    } catch (error) {
        console.error('Error processing progress update:', error)
        return NextResponse.json({ error: 'Failed to process update' }, { status: 500 })
    }
}

// Optional: Helper function to close all connections
export function closeAllConnections() {
    clients.forEach(client => {
        try {
            client.close()
        } catch (error) {
            console.error('Error closing client:', error)
        }
    })
    clients.clear()
} 