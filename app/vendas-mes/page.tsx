'use client'

import { useState, useMemo, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { format, parseISO, startOfMonth } from 'date-fns'
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

interface ChartDataEntry {
    date: string;
    [key: string]: string | number;
}

interface CacheData {
    data: DailySale[];
    timestamp: number;
}

interface Cache {
    [key: string]: CacheData;
}

export default function MonthlySales() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [isLoading, setIsLoading] = useState(true)
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [data, setData] = useState<DailySale[]>([])
    const [date, setDate] = useState<Date>(() => {
        const dateParam = searchParams.get('date')
        console.log('Initial date param:', dateParam)
        const initialDate = startOfMonth(dateParam ? new Date(dateParam) : new Date())
        console.log('Setting initial date to:', format(initialDate, 'yyyy-MM-dd'))
        return initialDate
    })
    const [selectedFilials, setSelectedFilials] = useState<string[]>(() => {
        if (data.length && data[0].Detalhes.length) {
            return data[0].Detalhes.map(detail => detail.NmEmpresaCurtoVenda);
        }
        return [];
    });
    const [error, setError] = useState<string | null>(null)

    const CACHE_KEY = 'vendas-mes-cache';
    const CACHE_DURATION = 60 * 60 * 1000; // 60 minutes in milliseconds

    const getCache = (): Cache => {
        if (typeof window === 'undefined') return {};
        const cache = localStorage.getItem(CACHE_KEY);
        return cache ? JSON.parse(cache) : {};
    };

    const setCache = (key: string, data: DailySale[]) => {
        if (typeof window === 'undefined') return;
        const cache = getCache();
        cache[key] = {
            data,
            timestamp: Date.now(),
        };
        localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    };

    const getCachedData = (key: string): DailySale[] | null => {
        const cache = getCache();
        const cachedData = cache[key];
        
        if (!cachedData) return null;
        
        const isExpired = Date.now() - cachedData.timestamp > CACHE_DURATION;
        if (isExpired) {
            // Clean up expired cache
            const newCache = getCache();
            delete newCache[key];
            localStorage.setItem(CACHE_KEY, JSON.stringify(newCache));
            return null;
        }
        
        return cachedData.data;
    };

    useEffect(() => {
        fetchData()
    }, [date])

    useEffect(() => {
        if (data.length && data[0].Detalhes.length) {
            setSelectedFilials(data[0].Detalhes.map(detail => detail.NmEmpresaCurtoVenda));
        }
    }, [data]);

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
        console.log('Refresh clicked - starting refresh...')
        setIsRefreshing(true)
        try {
            console.log('Calling fetchData with isRefreshing=true')
            await fetchData()
            console.log('Refresh completed successfully')
        } catch (error) {
            console.error('Error during refresh:', error)
        } finally {
            console.log('Resetting isRefreshing state')
            setIsRefreshing(false)
        }
    }

    const fetchData = async () => {
        try {
            console.log('fetchData started', { isRefreshing, date: format(date, 'yyyy-MM') })
            setError(null)
            
            if (!isRefreshing) {
                setIsLoading(true)
            }
            
            const cacheKey = format(date, 'yyyy-MM')
            console.log('Cache key:', cacheKey)
            
            if (isRefreshing) {
                console.log('Refresh mode: bypassing cache')
            } else {
                const cachedData = getCachedData(cacheKey)
                if (cachedData) {
                    console.log('Cache hit - using cached data')
                    setData(cachedData)
                    setIsLoading(false)
                    return
                }
                console.log('Cache miss - fetching fresh data')
            }
            
            // Calculate the first and last day of the selected month
            const firstDayOfMonth = startOfMonth(date)
            const lastDayOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0)
            
            const requestBody = {
                de: format(firstDayOfMonth, 'yyyy-MM-dd'),
                ate: format(lastDayOfMonth, 'yyyy-MM-dd')
            }
            
            console.log('Fetching data from API with date range:', requestBody)
            const response = await fetch('https://wh.sveletrica.com/webhook/ios-resumomes-filtro', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            })
            
            if (!response.ok) {
                throw new Error(`API error: ${response.status} ${response.statusText}`)
            }
            
            const salesData = await response.json()
            if (!Array.isArray(salesData)) {
                throw new Error('Invalid data format received from API')
            }
            
            console.log('Received data from API:', {
                records: salesData.length,
                firstDate: salesData[0]?.DataVenda,
                lastDate: salesData[salesData.length - 1]?.DataVenda
            })
            
            setData(salesData)
            
            if (!isRefreshing) {
                console.log('Updating cache with new data')
                setCache(cacheKey, salesData)
            }
            
        } catch (error) {
            console.error('Error in fetchData:', error)
            setError(error instanceof Error ? error.message : 'Failed to fetch data')
        } finally {
            if (!isRefreshing) {
                setIsLoading(false)
            }
            console.log('fetchData completed', { isRefreshing })
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
            return `${(value / 1000000).toFixed(1)}M`
        } else if (value >= 1000) {
            return `${(value / 1000).toFixed(0)}K`
        }
        return value.toString()
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

    const generateFilialColor = (index: number, total: number) => {
        const hue = (index / (total - 1)) * 40
        return `hsl(${hue}, 85%, 50%)`
    }

    // Add this function to get consistently sorted filials
    const getSortedFilials = (data: ChartDataEntry[]) => {
        return Object.keys(data[0] || {})
            .filter(key => key !== 'date')
            .map(filial => ({
                filial,
                total: calculateFilialTotal(data, filial)
            }))
            .sort((a, b) => b.total - a.total)
            .map(item => item.filial);
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
                                        const monthStart = startOfMonth(newDate)
                                        console.log('Calendar selection:', {
                                            selected: format(newDate, 'yyyy-MM-dd'),
                                            monthStart: format(monthStart, 'yyyy-MM-dd')
                                        })
                                        setDate(monthStart)
                                        router.push(`/vendas-mes?date=${format(monthStart, 'yyyy-MM-dd')}`)
                                    }
                                }}
                                initialFocus
                                locale={ptBR}
                                showOutsideDays={false}
                                ISOWeek
                                fromMonth={new Date(2024, 0)}
                                toMonth={new Date()}
                                defaultMonth={date}
                                formatters={{
                                    formatCaption: (date, options) => 
                                        format(date, "MMMM yyyy", { locale: options?.locale })
                                }}
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
                        <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
                            <div className="space-y-1.5">
                                <CardTitle>Vendas por Filial</CardTitle>
                                <p className="text-sm text-muted-foreground">
                                    Total do mês: {new Intl.NumberFormat('pt-BR', {
                                        style: 'currency',
                                        currency: 'BRL'
                                    }).format(calculateMonthTotal(chartData))}
                                </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {Object.keys(chartData[0] || {})
                                    .filter(key => key !== 'date')
                                    .map(filial => ({
                                        filial,
                                        total: calculateFilialTotal(chartData, filial)
                                    }))
                                    .sort((a, b) => b.total - a.total)
                                    .map((item, index, array) => {
                                        const color = generateFilialColor(index, array.length)
                                        
                                        return (
                                            <Button
                                                key={item.filial}
                                                variant={selectedFilials.includes(item.filial) ? "default" : "outline"}
                                                onClick={() => toggleFilial(item.filial)}
                                                className="text-xs flex flex-col gap-1 h-auto py-2"
                                                style={{
                                                    backgroundColor: selectedFilials.includes(item.filial) ? color : undefined,
                                                    borderColor: color,
                                                }}
                                            >
                                                <span>{item.filial}</span>
                                                <span className="text-[10px] opacity-80">
                                                    {new Intl.NumberFormat('pt-BR', {
                                                        style: 'currency',
                                                        currency: 'BRL',
                                                        notation: 'compact',
                                                        maximumFractionDigits: 1
                                                    }).format(item.total)}
                                                </span>
                                            </Button>
                                        )
                                    })}
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="overflow-x-auto">
                        <div className="min-w-[800px]">
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
                                        tick={{ 
                                            fill: 'hsl(var(--muted-foreground))',
                                            fontSize: 12
                                        }}
                                        tickFormatter={(value) => {
                                            if (value >= 1000000) {
                                                return `${(value / 1000000).toFixed(1)}M`
                                            }
                                            if (value >= 1000) {
                                                return `${(value / 1000).toFixed(0)}K`
                                            }
                                            return value.toString()
                                        }}
                                    />
                                    <Tooltip content={<CustomTooltip />} />
                                    {getSortedFilials(chartData)
                                        .filter(filial => selectedFilials.includes(filial))
                                        .map((filial, index, array) => {
                                            const sortedIndex = getSortedFilials(chartData).indexOf(filial);
                                            const color = generateFilialColor(sortedIndex, getSortedFilials(chartData).length);
                                            
                                            return (
                                                <Bar
                                                    key={filial}
                                                    dataKey={filial}
                                                    name={filial}
                                                    stackId="a"
                                                    fill={color}
                                                    isAnimationActive={false}
                                                    radius={[4, 4, 4, 4]}
                                                >
                                                    {index === array.length - 1 && (
                                                        <LabelList
                                                            dataKey={(entry: ChartDataEntry) => {
                                                                return selectedFilials.reduce((sum, fil) => 
                                                                    sum + (Number(entry[fil]) || 0), 0
                                                                );
                                                            }}
                                                            position="top"
                                                            offset={20}
                                                            fill="hsl(var(--foreground))"
                                                            fontSize={12}
                                                            formatter={(value: number) => formatCurrency(value)}
                                                            angle={-90}
                                                            dx={5}
                                                        />
                                                    )}
                                                </Bar>
                                            );
                                        })}
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
} 