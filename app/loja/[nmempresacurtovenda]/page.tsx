'use client'
import React from 'react'
import { PermissionGuard } from '@/components/guards/permission-guard'
import { useState, useEffect } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { ArrowLeft, ArrowUpDown, ChevronLeft, ChevronRight, Search } from 'lucide-react'
import Loading from '../../vendas-dia/loading'
import Link from 'next/link'
import { Roboto } from 'next/font/google'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceArea, ReferenceLine } from 'recharts'

const roboto = Roboto({
    weight: ['400', '500', '700'],
    subsets: ['latin'],
    display: 'swap',
})

// Reuse the same interfaces from the client page
interface StoreSale {
    cdpedido: string
    nrdocumento: string
    dtemissao: string
    tppessoa: string
    nmpessoa: string
    nmrepresentantevenda: string
    nmempresacurtovenda: string
    tpmovimentooperacao: string
    qtbrutaproduto: number
    vlfaturamento: number
    vltotalcustoproduto: number
    margem: string
    cdproduto: string
    nmproduto: string
    nmgrupoproduto: string
    dsunidadedenegocio: string
}

// Use the same interfaces and constants as in the client page
interface GroupedOrder {
    cdpedido: string
    nrdocumento: string
    dtemissao: string
    nmpessoa: string
    nmrepresentantevenda: string
    nmempresacurtovenda: string
    tpmovimentooperacao: string
    qtdsku: number
    total_faturamento?: number
    total_custo_produto?: number
    vlfaturamento?: number
    vltotalcustoproduto?: number
    margem: number
    items?: StoreSale[]
}

interface MonthlyData {
    month: string
    value: number
}

// Add the quotations interface
interface ClientQuotation {
    dtemissao: string
    cdpedidodevenda: string
    nmempresacurtovenda: string
    nmrepresentantevenda: string
    nmpessoa: string
    qtd_produtos: number
    total_preco_venda: number
    total_faturamento: number
    total_preco_custo: number
    total_custo_produto: number
    percentualdisponivel: number
}

// Update the SortField type to be more specific
type SortField = 'qtdsku' | 'total_faturamento' | 'total_custo_produto' | 'margem' | 'dtemissao'
type SortOrder = 'asc' | 'desc'

const ITEMS_PER_PAGE = 20

// Add these helper functions before the SalesmanDetails component

const getYearlyComparison = (orders: GroupedOrder[]) => {
    const currentYear = new Date().getFullYear()
    const lastYear = currentYear - 1

    const yearlyTotals = orders.reduce((acc, order) => {
        const [, , year] = order.dtemissao.split('/')
        const orderYear = parseInt(year)
        
        if (orderYear === currentYear) {
            acc.currentYear += order.vlfaturamento ?? 0
        } else if (orderYear === lastYear) {
            acc.lastYear += order.vlfaturamento ?? 0
        }
        
        return acc
    }, { currentYear: 0, lastYear: 0 })

    const percentageChange = yearlyTotals.lastYear > 0
        ? ((yearlyTotals.currentYear - yearlyTotals.lastYear) / yearlyTotals.lastYear) * 100
        : 0

    return {
        currentYear: yearlyTotals.currentYear,
        lastYear: yearlyTotals.lastYear,
        percentageChange
    }
}

const getYearlyTotals = (orders: GroupedOrder[]) => {
    return orders.reduce((acc, order) => {
        const year = order.dtemissao.split('/')[2]
        acc[year] = (acc[year] || 0) + (order.vlfaturamento ?? 0)
        return acc
    }, {} as Record<string, number>)
}

// Define interface for monthly performance data
interface ChannelPerformance {
    faturamento: number;
    custo: number;
}

interface MonthlyPerformanceData {
    faturamento: number;
    custo: number;
    channels: Record<string, ChannelPerformance>;
}

// Helper function to safely get faturamento value
const getFaturamento = (order: GroupedOrder): number => {
    if (order.total_faturamento !== undefined && typeof order.total_faturamento === 'number') {
        return order.total_faturamento;
    }
    
    if (order.vlfaturamento !== undefined && typeof order.vlfaturamento === 'number') {
        return order.vlfaturamento;
    }
    
    return 0;
}

// Helper function to safely get custo value
const getCusto = (order: GroupedOrder): number => {
    if (order.total_custo_produto !== undefined && typeof order.total_custo_produto === 'number') {
        return order.total_custo_produto;
    }
    
    if (order.vltotalcustoproduto !== undefined && typeof order.vltotalcustoproduto === 'number') {
        return order.vltotalcustoproduto;
    }
    
    return 0;
}

export default function StoreDetails() {
    // Use the same state and logic as in the client page
    const router = useRouter()
    const params = useParams()
    const searchParams = useSearchParams()
    const [data, setData] = useState<GroupedOrder[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [sortField, setSortField] = useState<SortField>('dtemissao')
    const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
    const [currentPage, setCurrentPage] = useState(1)
    const [recentQuotations, setRecentQuotations] = useState<ClientQuotation[]>([])
    const [loadingQuotations, setLoadingQuotations] = useState(false)
    const [monthlyPerformance, setMonthlyPerformance] = useState<any[]>([])
    const [loadingMonthlyPerformance, setLoadingMonthlyPerformance] = useState(false)
    const [selectedMonth, setSelectedMonth] = useState<string | null>(null)
    const [processingTime, setProcessingTime] = useState<number | null>(null)
    
    // Add state for range selection
    const [isSelecting, setIsSelecting] = useState(false)
    const [startMonth, setStartMonth] = useState<string | null>(null)
    const [endMonth, setEndMonth] = useState<string | null>(null)
    const [refAreaLeft, setRefAreaLeft] = useState<string | null>(null)
    const [refAreaRight, setRefAreaRight] = useState<string | null>(null)
    
    // Pre-calculated data from edge function
    const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([])
    const [yearlyComparison, setYearlyComparison] = useState<any>(null)
    const [yearlyTotals, setYearlyTotals] = useState<any[]>([])
    const [totals, setTotals] = useState<{faturamento: number, quantidade: number, pedidos: number} | null>(null)
    const [monthlyTotals, setMonthlyTotals] = useState<{
        faturamento: number,
        custo: number,
        margin: number,
        channels: Record<string, {faturamento: number, custo: number}>,
        formattedFaturamento?: string
    } | null>(null)

    // Reuse the same helper functions from the client page
    const groupOrders = (sales: any[]) => {
        // This function is no longer needed as the data comes pre-grouped from vw_vendamesporpedido_geral2
        // But we'll keep it for backward compatibility, just returning the data as is
        return sales;
    };

    // Reuse the same data fetching logic but with the new endpoint
    useEffect(() => {
        const fetchData = async () => {
            try {
                const nmempresacurtovenda = params?.nmempresacurtovenda as string
                if (!nmempresacurtovenda) {
                    throw new Error('Nome da loja não encontrado')
                }

                setIsLoading(true)
                const startTime = performance.now()
                
                // Use the new edge API endpoint that consolidates all data fetching
                const url = `/api/loja/edge/${encodeURIComponent(nmempresacurtovenda)}`
                const response = await fetch(url)
                const responseData = await response.json()

                if (!response.ok) {
                    throw new Error(
                        responseData.details || 
                        responseData.error || 
                        'Failed to fetch store sales'
                    )
                }

                // Set all the data from the consolidated response
                setData(responseData.orders || [])
                setRecentQuotations(responseData.quotations || [])
                setMonthlyPerformance(responseData.performance || [])
                
                // Set pre-calculated data
                setMonthlyData(responseData.monthlyData || [])
                setYearlyComparison(responseData.yearlyComparison || { currentYear: 0, lastYear: 0, percentageChange: 0 })
                setYearlyTotals(responseData.yearlyTotals || [])
                setTotals(responseData.totals || { faturamento: 0, quantidade: 0, pedidos: 0 })
                setMonthlyTotals(responseData.monthlyTotals || { faturamento: 0, custo: 0, margin: 0, channels: {} })
                
                // Calculate client-side processing time
                const clientTime = performance.now() - startTime
                setProcessingTime(clientTime + (responseData.processingTime || 0))
                
            } catch (err) {
                const error = err as Error
                setError(error.message || 'Failed to fetch store sales')
            } finally {
                setIsLoading(false)
                setLoadingQuotations(false)
                setLoadingMonthlyPerformance(false)
            }
        }

        fetchData()
    }, [params])

    useEffect(() => {
        setCurrentPage(1)
    }, [sortField, sortOrder])

    // Remove the separate API calls for quotations and monthly performance
    // as they are now included in the consolidated edge API response

    const handleBack = () => {
        const returnUrl = searchParams.get('returnUrl')
        if (returnUrl) {
            router.push(returnUrl)
        } else {
            router.back()
        }
    }

    if (isLoading) return <Loading />

    if (!data.length) {
        return (
            <div className="space-y-6">
                <div className="flex justify-end mb-4">
                    <Button
                        variant="ghost"
                        onClick={handleBack}
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Voltar
                    </Button>
                </div>
                <Card>
                    <CardContent className="p-6">
                        <p className="text-center text-muted-foreground">
                            Nenhuma venda encontrada para este cliente.
                        </p>
                    </CardContent>
                </Card>
            </div>
        )
    }

    // Helper function to compare dates in MM/YYYY format
    const compareDates = (date1: string, date2: string) => {
        const [month1, year1] = date1.split('/');
        const [month2, year2] = date2.split('/');
        
        if (year1 !== year2) {
            return parseInt(year1) - parseInt(year2);
        }
        
        return parseInt(month1) - parseInt(month2);
    }

    // Filter data by selected month or date range
    const filteredData = (() => {
        // If we have a date range
        if (startMonth && endMonth) {
            return data.filter(order => {
                const [day, month, year] = order.dtemissao.split('/');
                const orderMonth = `${month}/${year}`;
                
                // Ensure start is before end
                const start = compareDates(startMonth, endMonth) <= 0 ? startMonth : endMonth;
                const end = compareDates(startMonth, endMonth) <= 0 ? endMonth : startMonth;
                
                return compareDates(orderMonth, start) >= 0 && compareDates(orderMonth, end) <= 0;
            });
        }
        
        // If we have a single month selected
        if (selectedMonth) {
            return data.filter(order => {
                const [day, month, year] = order.dtemissao.split('/');
                return `${month}/${year}` === selectedMonth;
            });
        }
        
        // No filter
        return data;
    })();

    // Update the sort logic to use our helper functions
    const sortedData = [...filteredData].sort((a, b) => {
        const multiplier = sortOrder === 'asc' ? 1 : -1

        if (sortField === 'dtemissao') {
            // Convert DD/MM/YYYY to YYYY-MM-DD for proper date comparison
            const dateA = a.dtemissao.split('/').reverse().join('-')
            const dateB = b.dtemissao.split('/').reverse().join('-')
            return multiplier * (new Date(dateA).getTime() - new Date(dateB).getTime())
        }
        
        // Use our helper functions for faturamento and custo
        if (sortField === 'total_faturamento') {
            return multiplier * (getFaturamento(a) - getFaturamento(b))
        }
        
        if (sortField === 'total_custo_produto') {
            return multiplier * (getCusto(a) - getCusto(b))
        }

        // For other fields
        const valueA = typeof a[sortField] === 'string' ? parseFloat(a[sortField] as string) : (a[sortField] as number);
        const valueB = typeof b[sortField] === 'string' ? parseFloat(b[sortField] as string) : (b[sortField] as number);
        
        return multiplier * (valueA - valueB)
    })

    const paginatedData = sortedData.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    )

    const totalPages = Math.ceil(sortedData.length / ITEMS_PER_PAGE)

    const PaginationControls = () => (
        <div className="flex items-center justify-between px-2 py-4">
            <p className="text-sm text-muted-foreground">
                Mostrando {((currentPage - 1) * ITEMS_PER_PAGE) + 1} até {Math.min(currentPage * ITEMS_PER_PAGE, sortedData.length)} de {sortedData.length} resultados
            </p>
            <div className="flex items-center space-x-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
                    disabled={currentPage === 1}
                >
                    <ChevronLeft className="h-4 w-4" />
                    Anterior
                </Button>
                <div className="text-sm font-medium">
                    Página {currentPage} de {totalPages}
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))}
                    disabled={currentPage === totalPages}
                >
                    Próxima
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>
        </div>
    )

    // Get background color based on margin
    const getMarginBackgroundColor = (margin: number) => {
        if (margin >= 5) return 'bg-green-50 dark:bg-green-900/20';
        if (margin >= 0) return 'bg-yellow-50 dark:bg-yellow-900/20';
        return 'bg-red-50 dark:bg-red-900/20';
    };

    // Handle chart bar click
    const handleMonthClick = (data: any) => {
        if (data && data.activeLabel) {
            // Clear any existing range selection
            setStartMonth(null);
            setEndMonth(null);
            
            // If clicking the same month, clear the filter
            if (selectedMonth === data.activeLabel) {
                setSelectedMonth(null);
            } else {
                setSelectedMonth(data.activeLabel);
                setCurrentPage(1); // Reset to first page when filtering
            }
        }
    }

    // Handle mouse down for range selection
    const handleMouseDown = (e: any) => {
        if (e && e.activeLabel) {
            setIsSelecting(true);
            setRefAreaLeft(e.activeLabel);
            setRefAreaRight(null);
            
            // Clear single month selection when starting range selection
            setSelectedMonth(null);
        }
    }

    // Handle mouse move for range selection
    const handleMouseMove = (e: any) => {
        if (isSelecting && e && e.activeLabel) {
            setRefAreaRight(e.activeLabel);
        }
    }

    // Handle mouse up for range selection
    const handleMouseUp = () => {
        if (isSelecting && refAreaLeft && refAreaRight) {
            // Ensure left is before right
            const left = compareDates(refAreaLeft, refAreaRight) <= 0 ? refAreaLeft : refAreaRight;
            const right = compareDates(refAreaLeft, refAreaRight) <= 0 ? refAreaRight : refAreaLeft;
            
            setStartMonth(left);
            setEndMonth(right);
            setCurrentPage(1); // Reset to first page when filtering
        }
        
        // Reset selection state
        setIsSelecting(false);
        setRefAreaLeft(null);
        setRefAreaRight(null);
    }

    // Clear all filters
    const clearFilters = () => {
        setSelectedMonth(null);
        setStartMonth(null);
        setEndMonth(null);
    }

    // Get filter display text
    const getFilterDisplayText = () => {
        if (startMonth && endMonth) {
            return `(Filtrado por período: ${startMonth} até ${endMonth})`;
        }
        
        if (selectedMonth) {
            return `(Filtrado por: ${selectedMonth})`;
        }
        
        return null;
    }

    // Calculate totals from grouped orders (if not provided by the edge API)
    const calculatedTotals = totals || data.reduce((acc, order) => ({
        faturamento: acc.faturamento + getFaturamento(order),
        quantidade: acc.quantidade + (order.qtdsku || 0),
        pedidos: acc.pedidos + 1
    }), { faturamento: 0, quantidade: 0, pedidos: 0 });

    return (
        <PermissionGuard permission="sales">
        <div className="space-y-4">
            <div className="flex justify-end mb-4">
                <Button
                    variant="ghost"
                    onClick={handleBack}
                >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Voltar
                </Button>
            </div>

            <h1 className="text-3xl font-bold tracking-tight">
                {decodeURIComponent(params?.nmempresacurtovenda as string)}
            </h1>

            <div className="grid gap-4 grid-cols-3 md:grid-cols-3 lg:grid-cols-5">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-medium">
                            Total de Pedidos
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {calculatedTotals.pedidos}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-medium">
                            Total de Itens
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {calculatedTotals.quantidade}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-medium">
                            Faturamento Total
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            <div className="text-md md:text-sm lg:text-2xl font-bold">
                                {window.innerWidth < 600
                                    ? new Intl.NumberFormat('pt-BR', {
                                        notation: 'compact',
                                        compactDisplay: 'short',
                                        style: 'currency',
                                        currency: 'BRL'
                                    }).format(calculatedTotals.faturamento)
                                    : calculatedTotals.faturamento.toLocaleString('pt-BR', {
                                        style: 'currency',
                                        currency: 'BRL'
                                    })
                                }
                            </div>
                            <div className="space-y-1">
                                {yearlyTotals
                                    .sort((a, b) => b.year.localeCompare(a.year)) // Sort years in descending order
                                    .map((yearData) => (
                                        <div key={yearData.year} className="text-xs text-muted-foreground">
                                            {yearData.year}: {new Intl.NumberFormat('pt-BR', {
                                                notation: 'compact',
                                                compactDisplay: 'short',
                                                style: 'currency',
                                                currency: 'BRL',
                                                maximumFractionDigits: 2
                                            }).format(yearData.value).replace('bi', 'B').replace('mil', 'K')}
                                        </div>
                                    ))
                                }
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className={`col-span-2 md:col-span-1 lg:col-span-1 ${monthlyTotals ? getMarginBackgroundColor(monthlyTotals.margin) : ''}`}>
                    <CardHeader>
                        <CardTitle className="text-sm font-medium">
                            Resultado Mensal
                            {loadingMonthlyPerformance && (
                                <span className="ml-2 text-xs text-muted-foreground">(Carregando...)</span>
                            )}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            <div className="text-md md:text-sm lg:text-xl font-bold">
                                {monthlyTotals?.formattedFaturamento || calculatedTotals.faturamento.toLocaleString('pt-BR', {
                                    style: 'currency',
                                    currency: 'BRL'
                                })}
                            </div>
                            <div className={`text-md font-medium ${
                                monthlyTotals && monthlyTotals.margin >= 5
                                    ? 'text-green-600 dark:text-green-400'
                                    : monthlyTotals && monthlyTotals.margin >= 0
                                        ? 'text-yellow-600 dark:text-yellow-400'
                                        : 'text-red-600 dark:text-red-400'
                            }`}>
                                Margem: {monthlyTotals?.margin.toFixed(2) || '0.00'}%
                            </div>
                            <div className="space-y-1 pt-2">
                                <p className="text-xs font-medium">Por Canal:</p>
                                {monthlyTotals && Object.entries(monthlyTotals.channels)
                                    .sort((a, b) => b[1].faturamento - a[1].faturamento)
                                    .map(([channel, data]) => {
                                        const channelMargin = data.faturamento > 0
                                            ? ((data.faturamento - (data.faturamento * 0.268 + data.custo)) / data.faturamento) * 100
                                            : 0
                                        
                                        return (
                                            <div key={channel} className="flex justify-between text-xs">
                                                <span className="truncate" title={channel}>{channel}:</span>
                                                <span className={
                                                    channelMargin >= 5
                                                        ? 'text-green-600 dark:text-green-400'
                                                        : channelMargin >= 0
                                                            ? 'text-yellow-600 dark:text-yellow-400'
                                                            : 'text-red-600 dark:text-red-400'
                                                }>
                                                    {new Intl.NumberFormat('pt-BR', {
                                                        notation: 'compact',
                                                        compactDisplay: 'short',
                                                        style: 'currency',
                                                        currency: 'BRL'
                                                    }).format(data.faturamento)}
                                                    {' '}({channelMargin.toFixed(1)}%)
                                                </span>
                                            </div>
                                        )
                                    })}
                            </div>
                        </div>
                    </CardContent>
                </Card>
                    <Card className="col-span-1 md:col-span-2 lg:col-span-1">
                        <CardHeader>
                            <CardTitle className="text-sm font-medium">
                                Comparativo Anual
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                <div className="text-md md:text-sm lg:text-lg">
                                    {new Date().getFullYear()}:{' '}
                                    {window.innerWidth < 600
                                        ? new Intl.NumberFormat('pt-BR', {
                                            notation: 'compact',
                                            compactDisplay: 'short',
                                            style: 'currency',
                                            currency: 'BRL'
                                        }).format(yearlyComparison?.currentYear || 0)
                                        : (yearlyComparison?.currentYear || 0).toLocaleString('pt-BR', {
                                            style: 'currency',
                                            currency: 'BRL'
                                        })
                                    }
                                </div>
                                <div className="text-md md:text-sm lg:text-lg text-muted-foreground">
                                    {new Date().getFullYear() - 1}:{' '}
                                    {window.innerWidth < 600
                                        ? new Intl.NumberFormat('pt-BR', {
                                            notation: 'compact',
                                            compactDisplay: 'short',
                                            style: 'currency',
                                            currency: 'BRL'
                                        }).format(yearlyComparison?.lastYear || 0)
                                        : (yearlyComparison?.lastYear || 0).toLocaleString('pt-BR', {
                                            style: 'currency',
                                            currency: 'BRL'
                                        })
                                    }
                                </div>
                                <div className={`text-md md:text-sm lg:text-lg font-bold ${(yearlyComparison?.percentageChange || 0) >= 0
                                    ? 'text-green-600 dark:text-green-400'
                                    : 'text-red-600 dark:text-red-400'
                                    }`}>
                                    {(yearlyComparison?.percentageChange || 0) >= 0 ? '↑' : '↓'}{' '}
                                    {Math.abs(yearlyComparison?.percentageChange || 0).toFixed(1)}%
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
                    <div className="grid gap-4 grid-cols-2 md:grid-cols-2 lg:grid-cols-5">
                

                <Card className="col-span-2 md:col-span-3 lg:col-span-5">
                    <CardHeader>
                        <CardTitle className="text-sm font-medium flex justify-between items-center">
                            <span>
                                Evolução do Faturamento 
                                {getFilterDisplayText() && <span className="text-blue-500 ml-2">{getFilterDisplayText()}</span>}
                            </span>
                            {(selectedMonth || (startMonth && endMonth)) && (
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={clearFilters}
                                    className="h-7 px-2 text-xs"
                                >
                                    Limpar Filtro
                                </Button>
                            )}
                        </CardTitle>
                        <div className="text-xs text-muted-foreground mt-1">
                            Dica: Clique em um mês para filtrar ou arraste para selecionar um período
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[200px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart
                                    data={monthlyData}
                                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                                    onClick={handleMonthClick}
                                    onMouseDown={handleMouseDown}
                                    onMouseMove={handleMouseMove}
                                    onMouseUp={handleMouseUp}
                                >
                                    <defs>
                                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                                        </linearGradient>
                                        {/* Add gradient for selected area */}
                                        <linearGradient id="selectedArea" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.6} />
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.2} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis
                                        dataKey="month"
                                        fontSize={12}
                                        tickMargin={5}
                                    />
                                    <YAxis
                                        fontSize={12}
                                        tickFormatter={(value) =>
                                            new Intl.NumberFormat('pt-BR', {
                                                notation: 'compact',
                                                compactDisplay: 'short',
                                                style: 'currency',
                                                currency: 'BRL'
                                            }).format(value)
                                        }
                                    />
                                    <Tooltip
                                        formatter={(value: number) =>
                                            new Intl.NumberFormat('pt-BR', {
                                                style: 'currency',
                                                currency: 'BRL'
                                            }).format(value)
                                        }
                                        labelFormatter={(label) => `Mês: ${label}`}
                                    />
                                    {/* Show reference area during selection */}
                                    {refAreaLeft && refAreaRight && (
                                        <ReferenceArea 
                                            x1={refAreaLeft} 
                                            x2={refAreaRight} 
                                            strokeOpacity={0.3}
                                            fill="#8884d8"
                                            fillOpacity={0.3} 
                                        />
                                    )}
                                    
                                    {/* Show permanent highlight for selected month */}
                                    {selectedMonth && (
                                        <ReferenceArea
                                            x1={selectedMonth}
                                            x2={selectedMonth}
                                            fill="url(#selectedArea)"
                                            fillOpacity={0.8}
                                            stroke="#3b82f6"
                                            strokeWidth={1}
                                        />
                                    )}
                                    
                                    {/* Show permanent highlight for selected range */}
                                    {startMonth && endMonth && (
                                        <ReferenceArea
                                            x1={startMonth}
                                            x2={endMonth}
                                            fill="url(#selectedArea)"
                                            fillOpacity={0.6}
                                            stroke="#3b82f6"
                                            strokeWidth={1}
                                            strokeDasharray="3 3"
                                        />
                                    )}
                                    
                                    {/* Base area chart */}
                                    <Area
                                        type="monotone"
                                        dataKey="value"
                                        stroke="#2563eb"
                                        strokeWidth={2}
                                        fill="url(#colorValue)"
                                        dot={{ r: 4, fill: "#2563eb" }}
                                        activeDot={{ 
                                            r: 6, 
                                            fill: selectedMonth || (startMonth && endMonth) ? "#ef4444" : "#2563eb" 
                                        }}
                                    />
                                    
                                    {/* Add vertical lines for range boundaries */}
                                    {startMonth && endMonth && (
                                        <>
                                            <ReferenceLine
                                                x={startMonth}
                                                stroke="#3b82f6"
                                                strokeWidth={2}
                                                label={{
                                                    value: 'Início',
                                                    position: 'insideTopRight',
                                                    fill: '#3b82f6',
                                                    fontSize: 10
                                                }}
                                            />
                                            <ReferenceLine
                                                x={endMonth}
                                                stroke="#3b82f6"
                                                strokeWidth={2}
                                                label={{
                                                    value: 'Fim',
                                                    position: 'insideTopLeft',
                                                    fill: '#3b82f6',
                                                    fontSize: 10
                                                }}
                                            />
                                        </>
                                    )}
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Orçamentos Recentes</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                    {loadingQuotations ? (
                        <div className="flex flex-col items-center justify-center p-4 space-y-2">
                            <Loading />
                            <p className="text-sm text-muted-foreground">
                                Carregando orçamentos recentes...
                            </p>
                        </div>
                    ) : (
                        <div className="relative rounded-md border overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="hover:bg-transparent">
                                        <TableHead className="py-1 text-sm">Data</TableHead>
                                        <TableHead className="py-1 text-sm">Código</TableHead>
                                        <TableHead className="py-1 text-sm">Filial</TableHead>
                                        <TableHead className="py-1 text-sm">Cliente</TableHead>
                                        <TableHead className="py-1 text-sm text-right">Qtd Skus.</TableHead>
                                        <TableHead className="py-1 text-sm text-right">Total</TableHead>
                                        <TableHead className="py-1 text-sm text-right">Margem</TableHead>
                                        <TableHead className="py-1 text-sm text-right">% Disp</TableHead>
                                        <TableHead className="py-1 w-8"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {recentQuotations.map((quotation) => {
                                        const margin = ((quotation.total_faturamento - (quotation.total_faturamento * 0.268 + quotation.total_custo_produto)) / quotation.total_faturamento) * 100
                                        const isFullyAvailable = quotation.percentualdisponivel === 100;

                                        return (
                                            <TableRow 
                                                key={quotation.cdpedidodevenda}
                                                className="cursor-pointer hover:bg-muted/50"
                                                onClick={() => router.push(`/orcamento/${quotation.cdpedidodevenda}`)}
                                            >
                                                <TableCell className="py-1 text-sm">
                                                    {quotation.dtemissao}
                                                </TableCell>
                                                <TableCell className="py-1 text-sm">
                                                    <Link
                                                        href={`/orcamento/${quotation.cdpedidodevenda}`}
                                                        className="text-blue-500 hover:text-blue-700 underline"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        {quotation.cdpedidodevenda}
                                                    </Link>
                                                </TableCell>
                                                <TableCell className="py-1 text-sm">
                                                    {quotation.nmempresacurtovenda}
                                                </TableCell>
                                                <TableCell className="py-1 text-sm">
                                                    <Link
                                                        href={`/cliente/${encodeURIComponent(quotation.nmpessoa)}?returnUrl=${encodeURIComponent(window.location.pathname + window.location.search)}`}
                                                        className="text-blue-500 hover:text-blue-700 underline"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        {quotation.nmpessoa}
                                                    </Link>
                                                </TableCell>
                                                <TableCell className="py-1 text-sm text-right">
                                                    {quotation.qtd_produtos}
                                                </TableCell>
                                                <TableCell className="py-1 text-sm text-right whitespace-nowrap">
                                                    {quotation.total_faturamento.toLocaleString('pt-BR', {
                                                        style: 'currency',
                                                        currency: 'BRL'
                                                    })}
                                                </TableCell>
                                                <TableCell className={`py-1 text-sm text-right ${
                                                    margin >= 5
                                                        ? 'text-green-600 dark:text-green-400'
                                                        : margin >= 0
                                                            ? 'text-yellow-600 dark:text-yellow-400'
                                                            : 'text-red-600 dark:text-red-400'
                                                }`}>
                                                    {margin.toFixed(2)}%
                                                </TableCell>
                                                <TableCell className={`py-1 text-sm text-right ${
                                                    isFullyAvailable ? 'bg-green-100 dark:bg-green-900/30' : ''
                                                }`}>
                                                    {Math.max(0, quotation.percentualdisponivel || 0).toFixed(2)}%
                                                </TableCell>
                                                <TableCell className="py-1 px-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-6 w-6"
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            router.push(`/orcamento/${quotation.cdpedidodevenda}`)
                                                        }}
                                                    >
                                                        <Search className="h-3 w-3" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-sm font-medium flex justify-between items-center">
                        <span>
                            Histórico de Pedidos 
                            {getFilterDisplayText() && <span className="text-blue-500 ml-2">{getFilterDisplayText()}</span>}
                        </span>
                            {(selectedMonth || (startMonth && endMonth)) && (
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={clearFilters}
                                    className="h-7 px-2 text-xs"
                                >
                                    Limpar Filtro
                                </Button>
                            )}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>
                                        <Button
                                            variant="ghost"
                                            onClick={() => {
                                                if (sortField === 'dtemissao') {
                                                    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                                                } else {
                                                    setSortField('dtemissao')
                                                    setSortOrder('desc')
                                                }
                                            }}
                                        >
                                            Data
                                            <ArrowUpDown className="ml-2 h-4 w-4" />
                                        </Button>
                                    </TableHead>
                                    <TableHead>Pedido</TableHead>
                                    <TableHead>Documento</TableHead>
                                    <TableHead>Cliente</TableHead>
                                    <TableHead>Empresa</TableHead>
                                    <TableHead>Tipo</TableHead>
                                    <TableHead className="text-right">
                                        <Button
                                            variant="ghost"
                                            onClick={() => {
                                                if (sortField === 'qtdsku') {
                                                    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                                                } else {
                                                    setSortField('qtdsku')
                                                    setSortOrder('desc')
                                                }
                                            }}
                                        >
                                            Qtd Items
                                            <ArrowUpDown className="ml-2 h-4 w-4" />
                                        </Button>
                                    </TableHead>
                                    <TableHead className="text-right">
                                        <Button
                                            variant="ghost"
                                            onClick={() => {
                                                if (sortField === 'total_faturamento') {
                                                    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                                                } else {
                                                    setSortField('total_faturamento')
                                                    setSortOrder('desc')
                                                }
                                            }}
                                        >
                                            Faturamento
                                            <ArrowUpDown className="ml-2 h-4 w-4" />
                                        </Button>
                                    </TableHead>
                                    <TableHead className="text-right">
                                        <Button
                                            variant="ghost"
                                            onClick={() => {
                                                if (sortField === 'total_custo_produto') {
                                                    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                                                } else {
                                                    setSortField('total_custo_produto')
                                                    setSortOrder('desc')
                                                }
                                            }}
                                        >
                                            Custo
                                            <ArrowUpDown className="ml-2 h-4 w-4" />
                                        </Button>
                                    </TableHead>
                                    <TableHead className="text-right">
                                        <Button
                                            variant="ghost"
                                            onClick={() => {
                                                if (sortField === 'margem') {
                                                    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                                                } else {
                                                    setSortField('margem')
                                                    setSortOrder('desc')
                                                }
                                            }}
                                        >
                                            Margem
                                            <ArrowUpDown className="ml-2 h-4 w-4" />
                                        </Button>
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody className={roboto.className}>
                                {paginatedData.map((order, index) => {
                                    // Get the faturamento and custo values using our helper functions
                                    const faturamento = getFaturamento(order);
                                    const custo = getCusto(order);
                                    
                                    return (
                                        <TableRow key={index}>
                                            <TableCell>{order.dtemissao}</TableCell>
                                            <TableCell>
                                                <Link
                                                    href={`/vendas-dia/${order.cdpedido}?nrdocumento=${order.nrdocumento}&dtemissao=${order.dtemissao}`}
                                                    className="text-blue-500 hover:text-blue-700 underline"
                                                >
                                                    {order.cdpedido}
                                                </Link>
                                            </TableCell>
                                            <TableCell>{order.nrdocumento}</TableCell>
                                            <TableCell>
                                                <Link
                                                    href={`/cliente/${encodeURIComponent(order.nmpessoa)}?returnUrl=${encodeURIComponent(window.location.pathname + window.location.search)}`}
                                                    className="text-blue-500 hover:text-blue-700 underline"
                                                >
                                                    {order.nmpessoa}
                                                </Link>
                                            </TableCell>
                                            <TableCell>{order.nmempresacurtovenda}</TableCell>
                                            <TableCell>{order.tpmovimentooperacao}</TableCell>
                                            <TableCell className="text-right">{order.qtdsku}</TableCell>
                                            <TableCell className="text-right">
                                                {faturamento.toLocaleString('pt-BR', {
                                                    style: 'currency',
                                                    currency: 'BRL'
                                                })}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {custo.toLocaleString('pt-BR', {
                                                    style: 'currency',
                                                    currency: 'BRL'
                                                })}
                                            </TableCell>
                                            <TableCell
                                                className={`text-right ${order.margem >= 0
                                                        ? 'text-green-600 dark:text-green-400'
                                                        : 'text-red-600 dark:text-red-400'
                                                    }`}
                                            >
                                                {typeof order.margem === 'string' ? parseFloat(order.margem).toFixed(2) : order.margem.toFixed(2)}%
                                            </TableCell>
                                        </TableRow>
                                    )
                                })}
                            </TableBody>
                        </Table>
                    </div>
                    <PaginationControls />
                </CardContent>
            </Card>

            {/* Add processing time indicator if available */}
            {processingTime && (
                <div className="text-xs text-right text-muted-foreground">
                    Tempo de processamento: {processingTime.toFixed(2)}ms
                </div>
            )}
        </div>
        </PermissionGuard>
    )
} 