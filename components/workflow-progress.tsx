'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

interface WorkflowUpdate {
    step: number
    totalSteps: number
    stepName: string
    workflowId: string
    timestamp: string
    status?: 'completed' | 'in_progress' | 'error'
}

export function WorkflowProgress() {
    const [progress, setProgress] = useState<WorkflowUpdate | null>(null)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const eventSource = new EventSource('/api/workflow-progress')

        eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data) as WorkflowUpdate
                setProgress(data)

                // Check if workflow is completed
                if (data.status === 'completed' || data.step === data.totalSteps) {
                    eventSource.close()
                    // Dispatch completion event
                    window.dispatchEvent(new CustomEvent('workflowComplete'))
                }

                // Handle error status
                if (data.status === 'error') {
                    setError('Workflow failed')
                    eventSource.close()
                }
            } catch (err) {
                console.error('Error parsing SSE data:', err)
                setError('Failed to parse progress update')
            }
        }

        eventSource.onerror = (err) => {
            console.error('SSE connection error:', err)
            setError('Connection error')
            eventSource.close()
        }

        return () => {
            eventSource.close()
        }
    }, [])

    if (error) {
        return (
            <Card className="bg-destructive/10">
                <CardHeader>
                    <CardTitle>Workflow Progress Error</CardTitle>
                </CardHeader>
                <CardContent>
                    <p>{error}</p>
                </CardContent>
            </Card>
        )
    }

    if (!progress) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Iniciando atualização...</CardTitle>
                </CardHeader>
                <CardContent>
                    <Progress value={0} />
                </CardContent>
            </Card>
        )
    }

    const percentComplete = (progress.step / progress.totalSteps) * 100

    return (
        <Card>
            <CardHeader>
                <CardTitle>Atualizando ESL</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <div className="flex justify-between text-sm">
                        <span>Etapa {progress.step} de {progress.totalSteps}</span>
                        <span>{Math.round(percentComplete)}%</span>
                    </div>
                    <Progress value={percentComplete} />
                    <p className="text-sm text-muted-foreground">
                        {progress.stepName}
                    </p>
                </div>
            </CardContent>
        </Card>
    )
} 