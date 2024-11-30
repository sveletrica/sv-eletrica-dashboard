'use client'

import { useState, useMemo, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { CalendarIcon, RefreshCw } from "lucide-react"
import { cn } from '@/lib/utils'
import { useRouter, useSearchParams } from 'next/navigation'
import Loading from './loading'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, LabelList } from 'recharts'

interface SaleDetail {
    MaiorVendaDia: string
    TotalPedidosAtendidos: number
    NmEmpresaCurtoVenda: string
    TotalVendasDia: string
    TotalCustoDia: string
    MargemLucro: string
    DataExtracaoFormatada: string
}

interface DailySale {
    DataVenda: string
    Detalhes: SaleDetail[]
}

const filialColors = {
    'SV BM EXPRESS': 'hsl(0, 85%, 50%)',
    'SV FILIAL': 'hsl(10, 85%, 50%)',
    'SV MATRIZ': 'hsl(20, 85%, 50%)',
    'SV SOBRAL': 'hsl(30, 85%, 50%)',
    'SV WS EXPRESS': 'hsl(40, 85%, 50%)',
} as const;

interface ChartDataEntry {
    date: string;
    [key: string]: string | number;
}

export default function MonthlySales() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [isLoading, setIsLoading] = useState(true)
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [data, setData] = useState<DailySale[]>([])
    const [date, setDate] = useState<Date>(() => {
        const dateParam = searchParams.get('date')
        return dateParam ? new Date(dateParam) : new Date()
    })
    const [selectedFilials, setSelectedFilials] = useState<string[]>(Object.keys(filialColors))
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        fetchData()
    }, [date])

    const chartData = useMemo(() => {
        const dailyTotals = data.reduce((acc, day) => {
            const date = parseISO(day.DataVenda)
            date.setDate(date.getDate() + 1)
            const formattedDate = format(date, 'dd/MM')
            
            const dayData = {
                date: formattedDate,
            }

            day.Detalhes.forEach(detail => {
                const value = parseFloat(detail.TotalVendasDia.replace('R$ ', '').replace('.', '').replace(',', '.'))
                dayData[detail.NmEmpresaCurtoVenda] = value
            })

            acc.push(dayData)
            return acc
        }, [] as any[])

        return dailyTotals.sort((a, b) => {
            const [dayA, monthA] = a.date.split('/').map(Number)
            const [dayB, monthB] = b.date.split('/').map(Number)
            if (monthA !== monthB) return monthA - monthB
            return dayA - dayB
        })
    }, [data])

    const handleRefresh = async () => {
        setIsRefreshing(true)
        await fetchData()
        setIsRefreshing(false)
    }

    const fetchData = async () => {
        try {
            setError(null)
            setIsLoading(true)
            
            const response = await fetch('https://wh.sveletrica.com/webhook/ios-resumomes')
            if (!response.ok) {
                throw new Error('Failed to fetch data')
            }
            
            const salesData = await response.json()
            if (!Array.isArray(salesData)) {
                throw new Error('Invalid data format received')
            }
            
            console.log('Received data:', salesData.length, 'records')
            setData(salesData)
        } catch (error) {
            console.error('Error fetching monthly sales:', error)
            setError(error instanceof Error ? error.message : 'Failed to fetch data')
        } finally {
            setIsLoading(false)
        }
    }

    const toggleFilial = (filial: string) => {
        setSelectedFilials(prev => 
            prev.includes(filial) 
                ? prev.filter(f => f !== filial)
                : [...prev, filial]
        )
    }

    if (isLoading) return <Loading />

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-background border rounded-lg shadow-lg p-2">
                    <p className="font-medium">Dia {label}</p>
                    {payload.map((entry: any, index: number) => (
                        <p key={index} className="text-sm">
                            {entry.name}: {new Intl.NumberFormat('pt-BR', {
                                style: 'currency',
                                currency: 'BRL'
                            }).format(entry.value)}
                        </p>
                    ))}
                    <p className="text-sm font-medium border-t mt-1 pt-1">
                        Total: {new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL'
                        }).format(payload.reduce((sum: number, entry: any) => sum + entry.value, 0))}
                    </p>
                </div>
            )
        }
        return null
    }

    const formatCurrency = (value: number) => {
        if (value >= 1000000) {
            return `${(value / 1000000).toFixed(2)}M`
        } else if (value >= 1000) {
            return `${(value / 1000).toFixed(0)}K`
        }
        return value.toFixed(0)
    }

    const calculateMonthTotal = (data: ChartDataEntry[]) => {
        return data.reduce((total, dayData) => {
            const dayTotal = selectedFilials.reduce((sum, filial) => 
                sum + (Number(dayData[filial]) || 0), 0
            );
            return total + dayTotal;
        }, 0);
    };

    const calculateFilialTotal = (data: ChartDataEntry[], filial: string) => {
        return data.reduce((total, dayData) => 
            total + (Number(dayData[filial]) || 0), 0
        );
    };

    return (
        <div className="space-y-4">
            {error && (
                <div className="bg-destructive/15 text-destructive px-4 py-3 rounded-lg">
                    {error}
                </div>
            )}
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Vendas do Mês</h1>
                <div className="flex items-center gap-4">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                className={cn(
                                    "justify-start text-left font-normal",
                                    !date && "text-muted-foreground"
                                )}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {format(date, "MMMM 'de' yyyy", { locale: ptBR })}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                mode="single"
                                selected={date}
                                onSelect={(newDate) => {
                                    if (newDate) {
                                        setDate(newDate)
                                        router.push(`/vendas-mes?date=${format(newDate, 'yyyy-MM-dd')}`)
                                    }
                                }}
                                initialFocus
                                locale={ptBR}
                            />
                        </PopoverContent>
                    </Popover>

                    <Button
                        variant="outline"
                        size="icon"
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                    >
                        <RefreshCw className={cn(
                            "h-4 w-4",
                            isRefreshing && "animate-spin"
                        )} />
                    </Button>
                </div>
            </div>

            <div className="grid gap-4 grid-cols-1">
                <Card>
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <div className="space-y-1.5">
                                <CardTitle>Vendas por Filial</CardTitle>
                                <p className="text-sm text-muted-foreground">
                                    Total do mês: {new Intl.NumberFormat('pt-BR', {
                                        style: 'currency',
                                        currency: 'BRL'
                                    }).format(calculateMonthTotal(chartData))}
                                </p>
                            </div>
                            <div className="flex gap-2">
                                {Object.entries(filialColors)
                                    .map(([filial, color]) => ({
                                        filial,
                                        color,
                                        total: calculateFilialTotal(chartData, filial)
                                    }))
                                    .sort((a, b) => b.total - a.total)
                                    .map(({ filial, color, total }) => (
                                        <Button
                                            key={filial}
                                            variant={selectedFilials.includes(filial) ? "default" : "outline"}
                                            onClick={() => toggleFilial(filial)}
                                            className="text-xs flex flex-col gap-1 h-auto py-2"
                                            style={{
                                                backgroundColor: selectedFilials.includes(filial) ? color : undefined,
                                                borderColor: color,
                                            }}
                                        >
                                            <span>{filial}</span>
                                            <span className="text-[10px] opacity-80">
                                                {new Intl.NumberFormat('pt-BR', {
                                                    style: 'currency',
                                                    currency: 'BRL',
                                                    notation: 'compact',
                                                    maximumFractionDigits: 1
                                                }).format(total)}
                                            </span>
                                        </Button>
                                    ))}
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={400}>
                            <BarChart 
                                data={chartData} 
                                margin={{ top: 40, right: 30, left: 20, bottom: 5 }}
                            >
                                <CartesianGrid 
                                    strokeDasharray="3 3" 
                                    vertical={false}
                                    stroke="hsl(var(--border))"
                                />
                                <XAxis
                                    dataKey="date"
                                    tickLine={false}
                                    axisLine={false}
                                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                                    tickFormatter={(value) => value.split('/')[0]}
                                />
                                <YAxis
                                    tickLine={false}
                                    axisLine={false}
                                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                                    tickFormatter={(value) => 
                                        new Intl.NumberFormat('pt-BR', {
                                            style: 'currency',
                                            currency: 'BRL',
                                            notation: 'compact',
                                            maximumFractionDigits: 1
                                        }).format(value)
                                    }
                                />
                                <Tooltip content={<CustomTooltip />} />
                                {selectedFilials.map((filial, index) => (
                                    <Bar
                                        key={filial}
                                        dataKey={filial}
                                        name={filial}
                                        stackId="a"
                                        fill={filialColors[filial as keyof typeof filialColors]}
                                        isAnimationActive={false}
                                        radius={[4, 4, 0, 0]}
                                    >
                                        {index === selectedFilials.length - 1 && (
                                            <LabelList
                                                dataKey={(entry: ChartDataEntry) => {
                                                    return selectedFilials.reduce((sum, fil) => 
                                                        sum + (Number(entry[fil]) || 0), 0
                                                    );
                                                }}
                                                position="top"
                                                offset={12}
                                                fill="hsl(var(--foreground))"
                                                fontSize={12}
                                                formatter={(value: number) => formatCurrency(value)}
                                            />
                                        )}
                                    </Bar>
                                ))}
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
} 