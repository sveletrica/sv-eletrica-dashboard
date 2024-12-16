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
    const [retryCount, setRetryCount] = useState(0)
    const MAX_RETRIES = 3

    useEffect(() => {
        let eventSource: EventSource | null = null

        const connectSSE = () => {
            if (retryCount >= MAX_RETRIES) {
                setError('Falha na conexão após várias tentativas')
                return
            }

            eventSource = new EventSource('/api/workflow-progress')

            eventSource.onopen = () => {
                setError(null)
                setRetryCount(0)
            }

            eventSource.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data) as WorkflowUpdate
                    setProgress(data)

                    if (data.status === 'completed' || data.step === data.totalSteps) {
                        eventSource?.close()
                        window.dispatchEvent(new CustomEvent('workflowComplete'))
                    }

                    if (data.status === 'error') {
                        setError('Falha na atualização')
                        eventSource?.close()
                    }
                } catch (err) {
                    console.error('Error parsing SSE data:', err)
                    setError('Erro ao processar atualização')
                }
            }

            eventSource.onerror = (err) => {
                console.error('SSE connection error:', err)
                eventSource?.close()
                setRetryCount(prev => prev + 1)
                
                // Attempt to reconnect after a delay
                setTimeout(() => {
                    connectSSE()
                }, 1000 * (retryCount + 1)) // Exponential backoff
            }
        }

        connectSSE()

        return () => {
            if (eventSource) {
                eventSource.close()
            }
        }
    }, [retryCount])

    if (error) {
        return (
            <Card className="bg-destructive/10">
                <CardHeader>
                    <CardTitle>Erro na Atualização</CardTitle>
                </CardHeader>
                <CardContent>
                    <p>{error}</p>
                    {retryCount < MAX_RETRIES && (
                        <p className="text-sm text-muted-foreground mt-2">
                            Tentando reconectar... ({retryCount + 1}/{MAX_RETRIES})
                        </p>
                    )}
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