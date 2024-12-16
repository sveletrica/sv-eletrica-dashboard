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
}

export function WorkflowProgress() {
    const [progress, setProgress] = useState<WorkflowUpdate | null>(null)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const eventSource = new EventSource('/api/workflow-progress')

        eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data)
                setProgress(data)
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
        return null
    }

    const percentComplete = (progress.step / progress.totalSteps) * 100

    return (
        <Card>
            <CardHeader>
                <CardTitle>Workflow Progress</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <div className="flex justify-between text-sm">
                        <span>Step {progress.step} of {progress.totalSteps}</span>
                        <span>{Math.round(percentComplete)}%</span>
                    </div>
                    <Progress value={percentComplete} />
                    <p className="text-sm text-muted-foreground">
                        Current step: {progress.stepName}
                    </p>
                </div>
            </CardContent>
        </Card>
    )
} 