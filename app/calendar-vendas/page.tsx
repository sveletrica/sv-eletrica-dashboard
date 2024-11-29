'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DailySale } from '@/types/sales'
import { ptBR } from 'date-fns/locale'
import Loading from '../vendas-dia/loading'
import { DataExtracao } from '@/components/data-extracao'

export default function CalendarVendas() {
    const [date, setDate] = useState<Date>(new Date())
    const [data, setData] = useState<DailySale[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchData = async (selectedDate: Date) => {
        try {
            setError(null)
            setIsLoading(true)

            const queryDate = `eq.${format(selectedDate, 'dd/MM/yyyy')}`
            const response = await fetch(`/api/vendas-dia?date=${encodeURIComponent(queryDate)}`)

            if (!response.ok) {
                throw new Error('Failed to fetch sales data')
            }

            const salesData = await response.json()
            setData(salesData)
        } catch (error) {
            console.error('Error fetching sales data:', error)
            setError(error instanceof Error ? error.message : 'Failed to fetch sales data')
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchData(date)
    }, [date])

    // Calculate summary data
    const summary = data.reduce((acc, sale) => {
        return {
            totalSales: acc.totalSales + sale.total_faturamento,
            totalOrders: acc.totalOrders + 1,
            totalItems: acc.totalItems + sale.qtdsku,
            totalCost: acc.totalCost + sale.total_custo_produto
        }
    }, {
        totalSales: 0,
        totalOrders: 0,
        totalItems: 0,
        totalCost: 0
    })

    const margin = summary.totalSales > 0
        ? ((summary.totalSales - (summary.totalSales * 0.268 + summary.totalCost)) / summary.totalSales * 100)
        : 0

    if (isLoading) {
        return <Loading />
    }

    return (
        <div className="space-y-6 p-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold">Calendário de Vendas</h1>
                {error && (
                    <div className="bg-destructive/15 text-destructive px-4 py-3 rounded-lg">
                        {error}
                    </div>
                )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">
                            Selecione uma Data
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Calendar
                            mode="single"
                            selected={date}
                            onSelect={(newDate) => newDate && setDate(newDate)}
                            locale={ptBR}
                            disabled={{ after: new Date() }}
                            className="rounded-md border"
                        />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">
                            Resumo do Dia - {format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <p className="text-sm text-muted-foreground">Pedidos</p>
                                <p className="text-2xl font-bold">{summary.totalOrders}</p>
                            </div>
                            <div className="space-y-2">
                                <p className="text-sm text-muted-foreground">Itens</p>
                                <p className="text-2xl font-bold">{summary.totalItems}</p>
                            </div>
                            <div className="space-y-2">
                                <p className="text-sm text-muted-foreground">Faturamento</p>
                                <p className="text-2xl font-bold">
                                    {summary.totalSales.toLocaleString('pt-BR', {
                                        style: 'currency',
                                        currency: 'BRL'
                                    })}
                                </p>
                            </div>
                            <div className="space-y-2">
                                <p className="text-sm text-muted-foreground">Margem</p>
                                <p className={`text-2xl font-bold ${margin < 0 ? 'text-red-600' :
                                        margin <= 3 ? 'text-yellow-600' :
                                            'text-green-600'
                                    }`}>
                                    {margin.toFixed(2)}%
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <DataExtracao />
        </div>
    )
} 