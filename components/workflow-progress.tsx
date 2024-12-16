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
    status?: 'completed' | 'in_progress' | 'error' | 'waiting'
}

export function WorkflowProgress() {
    const [progress, setProgress] = useState<WorkflowUpdate | null>(null)
    const [error, setError] = useState<string | null>(null)
    const POLLING_INTERVAL = 1000 // 1 second

    useEffect(() => {
        let pollInterval: NodeJS.Timeout

        const fetchProgress = async () => {
            try {
                const response = await fetch('/api/workflow-progress')
                if (!response.ok) throw new Error('Failed to fetch progress')
                
                const data = await response.json()
                setProgress(data)

                if (data.status === 'completed' || data.step === data.totalSteps) {
                    window.dispatchEvent(new CustomEvent('workflowComplete'))
                    clearInterval(pollInterval)
                }

                if (data.status === 'error') {
                    setError('Falha na atualização')
                    clearInterval(pollInterval)
                }
            } catch (err) {
                console.error('Error fetching progress:', err)
                setError('Erro ao buscar atualização')
                clearInterval(pollInterval)
            }
        }

        // Initial fetch
        fetchProgress()

        // Start polling
        pollInterval = setInterval(fetchProgress, POLLING_INTERVAL)

        return () => {
            clearInterval(pollInterval)
        }
    }, [])

    if (error) {
        return (
            <Card className="bg-destructive/10">
                <CardHeader>
                    <CardTitle>Erro na Atualização</CardTitle>
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