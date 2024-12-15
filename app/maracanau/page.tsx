'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Chart } from "@/components/ui/chart"
import { Button } from "@/components/ui/button"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { 
    Package, 
    Tag, 
    AlertTriangle, 
    Tags, 
    AlertCircle, 
    PackageX, 
    CheckCircle2,
    RefreshCw,
    ArrowRight,
    Check
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { MaracanauStats } from '@/types/maracanau'
import MaracanauLoading from './loading'
import './styles.css'
import Link from 'next/link'
import { toast } from "sonner"

const CACHE_KEY = 'maracanauData'
const CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 hours in milliseconds

type CachedData = {
    stats: MaracanauStats
    timestamp: number
}

export default function Maracanau() {
    const [isLoading, setIsLoading] = useState(true)
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [data, setData] = useState<MaracanauStats | null>(null)
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [isUpdatingESL, setIsUpdatingESL] = useState(false)

    const loadFromCache = () => {
        if (typeof window !== 'undefined') {
            const cached = localStorage.getItem(CACHE_KEY)
            if (cached) {
                try {
                    const parsedCache: CachedData = JSON.parse(cached)
                    const now = Date.now()
                    if (now - parsedCache.timestamp < CACHE_DURATION) {
                        setData(parsedCache.stats)
                        setLastUpdate(new Date(parsedCache.timestamp))
                        setIsLoading(false)
                        return true
                    }
                } catch (error) {
                    console.error('Error parsing cache:', error)
                }
            }
        }
        return false
    }

    const fetchData = async (force: boolean = false) => {
        setError(null)
        
        try {
            if (!force && loadFromCache()) {
                return
            }

            const response = await fetch('/api/maracanau', {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                },
            })
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}))
                throw new Error(errorData.error || 'Failed to fetch data')
            }

            const rawData = await response.json()
            
            if (!Array.isArray(rawData) || rawData.length === 0) {
                throw new Error('No data available')
            }

            const stats: MaracanauStats = rawData[0]
            
            if (typeof window !== 'undefined') {
                localStorage.setItem(CACHE_KEY, JSON.stringify({
                    stats,
                    timestamp: Date.now()
                }))
            }

            setData(stats)
            setLastUpdate(new Date())
            setIsLoading(false)
        } catch (error) {
            console.error('Error fetching data:', error)
            setError(error instanceof Error ? error.message : 'Failed to load data')
            setData(null)
        } finally {
            setIsLoading(false)
            setIsRefreshing(false)
        }
    }

    const handleRefresh = async () => {
        setIsRefreshing(true)
        await fetchData(true)
        setIsRefreshing(false)
    }

    const handleESLUpdate = async () => {
        setIsUpdatingESL(true)
        try {
            const response = await fetch('https://wh.sveletrica.com/webhook/8c9ae829-f325-409e-8d56-2aa6ab387668', {
                method: 'POST',
            })
            
            if (response.ok) {
                toast.success('ESL atualizado com sucesso!')
            } else {
                throw new Error('Falha ao atualizar ESL')
            }
        } catch (error) {
            toast.error('Erro ao atualizar ESL')
            console.error('Error updating ESL:', error)
        } finally {
            setIsUpdatingESL(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [])

    const calculatePercentage = (value: number, total: number) => {
        return ((value / total) * 100).toFixed(1)
    }

    if (isLoading || !data || typeof data.totalEstoque === 'undefined') {
        return <MaracanauLoading />
    }

    const safeData = {
        totalEstoque: data.totalEstoque ?? 0,
        produtosEtiquetados: data.produtosEtiquetados ?? 0,
        produtosSemEtiqueta: data.produtosSemEtiqueta ?? 0,
        produtosMultiplasEtiquetas: data.produtosMultiplasEtiquetas ?? 0,
        etiquetasDuplicadas: data.etiquetasDuplicadas ?? 0,
        emStkSemEtiq: data.emStkSemEtiq ?? 0,
        bindSemStk: data.bindSemStk ?? 0,
        skuetiquetados: data.skuetiquetados ?? 0
    }

    const chartData = [{
        name: 'Maracanau',
        totalTagged: safeData.skuetiquetados,
        tagsUsedTwice: safeData.etiquetasDuplicadas,
        taggedNoStock: safeData.bindSemStk
    }]

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center pl-10">
                <h1 className="text-3xl font-bold">Maracanau</h1>
                <div className="flex items-center gap-4">
                    {lastUpdate && (
                        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-black text-white px-4 py-2 rounded-full">
                            <span className="text-xs">
                                Última atualização: {format(lastUpdate, "dd/MM/yyyy HH:mm", { locale: ptBR })}
                            </span>
                        </div>
                    )}
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                    >
                        <RefreshCw className={cn(
                            "h-4 w-4 mr-2",
                            isRefreshing && "animate-spin"
                        )} />
                        Atualizar
                    </Button>
                    <Button
                        variant="default"
                        size="sm"
                        onClick={handleESLUpdate}
                        disabled={isUpdatingESL}
                        className="bg-green-600 hover:bg-green-700"
                    >
                        {isUpdatingESL ? (
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                            <Check className="h-4 w-4 mr-2" />
                        )}
                        Atualizar ESL
                    </Button>
                </div>
            </div>

            {error && (
                <div className="bg-destructive/15 text-destructive px-4 py-3 rounded-lg">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-3 md:grid-cols-3 gap-6">
                <Card className="stats-card">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total em Estoque</CardTitle>
                        <Package className="h-7 w-7 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold">{safeData.totalEstoque.toLocaleString('pt-BR')}</p>
                    </CardContent>
                </Card>
                <Card className="stats-card">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Etiquetas em uso</CardTitle>
                        <Tag className="h-7 w-7 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold">{safeData.produtosEtiquetados.toLocaleString('pt-BR')}</p>
                        <p className="text-xs md:text-sm text-muted-foreground">
                            {calculatePercentage(safeData.produtosEtiquetados, safeData.totalEstoque)}% do total
                        </p>
                    </CardContent>
                </Card>
                <Card className="stats-card group">
                    <Link href="/sem-etiqueta-maracanau">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Em Stk sem Etiqueta</CardTitle>
                            <AlertTriangle className="h-7 w-7 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <p className="text-3xl font-bold">{safeData.emStkSemEtiq.toLocaleString('pt-BR')}</p>
                            <p className="text-xs md:text-sm text-muted-foreground">
                                {calculatePercentage(safeData.emStkSemEtiq, safeData.totalEstoque)}% do total
                            </p>
                            <p className="text-xs md:text-sm  text-muted-foreground mt-2 flex items-center gap-1 group-hover:text-primary transition-colors">
                                Ver detalhes <ArrowRight className="h-4 w-4" />
                            </p>
                        </CardContent>
                    </Link>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Distribuição de Etiquetas</CardTitle>
                </CardHeader>
                <CardContent>
                    <Chart data={chartData} config={chartConfig} />
                </CardContent>
            </Card>

            <Card className="stats-card">
                <CardHeader>
                    <CardTitle>Detalhes Adicionais</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="flex flex-row items-center space-x-2">
                            <Tags className="h-7 w-7 text-muted-foreground" />
                            <div>
                                <h3 className="font-semibold">SKU comMúltiplas Etiquetas</h3>
                                <p className="text-2xl font-bold">{safeData.produtosMultiplasEtiquetas.toLocaleString('pt-BR')}</p>
                                <p className="text-sm text-muted-foreground">
                                    {calculatePercentage(safeData.produtosMultiplasEtiquetas, safeData.totalEstoque)}% do total
                                </p>
                            </div>
                        </div>
                        <div className="flex flex-row items-center space-x-2">
                            <AlertCircle className="h-7 w-7 text-muted-foreground" />
                            <div>
                                <h3 className="font-semibold">Etiquetas Duplicadas</h3>
                                <p className="text-2xl font-bold">{safeData.etiquetasDuplicadas.toLocaleString('pt-BR')}</p>
                                <p className="text-sm text-muted-foreground">
                                    {calculatePercentage(safeData.etiquetasDuplicadas, safeData.totalEstoque)}% do total
                                </p>
                            </div>
                        </div>
                        <div className="flex flex-row items-center space-x-2 group cursor-pointer">
                            <Link href="/bind-sem-estoque" className="flex flex-row items-center space-x-2">
                                <PackageX className="h-7 w-7 text-muted-foreground group-hover:text-primary transition-colors" />
                                <div>
                                    <h3 className="font-semibold group-hover:text-primary transition-colors">Bind sem Estoque</h3>
                                    <p className="text-2xl font-bold group-hover:text-primary transition-colors">
                                        {safeData.bindSemStk.toLocaleString('pt-BR')}
                                    </p>
                                    <p className="text-xs md:text-sm text-muted-foreground flex items-center gap-1 group-hover:text-primary transition-colors">
                                        Ver detalhes <ArrowRight className="h-4 w-4" />
                                    </p>
                                </div>
                            </Link>
                        </div>
                        <div className="flex flex-row items-center space-x-2">
                            <CheckCircle2 className="h-7 w-7 text-muted-foreground" />
                            <div>
                                <h3 className="font-semibold">SKUs Etiquetados</h3>
                                <p className="text-2xl font-bold">{safeData.skuetiquetados.toLocaleString('pt-BR')}</p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

const chartConfig = {
    totalTagged: { 
        label: "Total Etiquetado", 
        color: "#16a34a",
        showValue: true
    },
    tagsUsedTwice: { 
        label: "Etiquetas Duplicadas", 
        color: "#eab308",
        showValue: true
    },
    taggedNoStock: { 
        label: "Etiquetados sem Estoque", 
        color: "#dc2626",
        showValue: true
    },
} 