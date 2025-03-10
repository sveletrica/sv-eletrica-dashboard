'use client';

import React from 'react';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Progress } from "../components/ui/progress";

interface WorkflowUpdate {
    step: number
    totalSteps: number
    stepName: string
    workflowId: string
    timestamp: string
    status?: 'completed' | 'in_progress' | 'error' | 'waiting'
}

export function WorkflowProgress() {
    const [progress, setProgress] = useState<WorkflowUpdate | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [timeoutCount, setTimeoutCount] = useState(0);
    const POLLING_INTERVAL = 1000; // 1 second
    const MAX_TIMEOUT_ATTEMPTS = 3; // Maximum number of consecutive timeouts before showing error

    useEffect(() => {
        const pollInterval = setInterval(async () => {
            try {
                const response = await fetch('/api/workflow-progress');

                if (!response.ok) {
                    if (response.status === 404) {
                        setTimeoutCount(prev => prev + 1);
                        if (timeoutCount >= MAX_TIMEOUT_ATTEMPTS) {
                            throw new Error('Processo não encontrado');
                        }
                        return;
                    }
                    throw new Error('Failed to fetch progress');
                }

                const data = await response.json();
                setTimeoutCount(0); // Reset timeout counter on successful response
                setProgress(data);

                if (data.status === 'completed' || data.step === data.totalSteps) {
                    window.dispatchEvent(new CustomEvent('workflowComplete', {
                        detail: { success: true }
                    }));
                    clearInterval(pollInterval);
                }

                if (data.status === 'error') {
                    window.dispatchEvent(new CustomEvent('workflowComplete', {
                        detail: { success: false, error: 'Falha na atualização' }
                    }));
                    setError('Falha na atualização');
                    clearInterval(pollInterval);
                }
            } catch (err) {
                console.error('Error fetching progress:', err);
                const errorMessage = err instanceof Error ? err.message : 'Erro ao buscar atualização';
                setError(errorMessage);
                window.dispatchEvent(new CustomEvent('workflowComplete', {
                    detail: { success: false, error: errorMessage }
                }));
                clearInterval(pollInterval);
            }
        }, POLLING_INTERVAL);

        // Initial fetch
        (async () => {
            try {
                const response = await fetch('/api/workflow-progress');
                if (!response.ok) throw new Error('Failed to fetch initial progress');
                const data = await response.json();
                setProgress(data);
            } catch (err) {
                console.error('Error fetching initial progress:', err);
            }
        })();

        return () => clearInterval(pollInterval);
    }, [timeoutCount]);

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
        );
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
        );
    }

    const percentComplete = (progress.step / progress.totalSteps) * 100;

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
    );
} 