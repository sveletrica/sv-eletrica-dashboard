'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { ArrowLeft, ArrowUpDown, ChevronLeft, ChevronRight, X, Search } from 'lucide-react'
import Loading from '../../vendas-dia/loading'
import Link from 'next/link'
import { Roboto } from 'next/font/google'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { startOfMonth, endOfMonth, parseISO } from 'date-fns'
import { cn } from '@/lib/utils'

const roboto = Roboto({
    weight: ['400', '500', '700'],
    subsets: ['latin'],
    display: 'swap',
})

interface ClientSale {
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

interface GroupedOrder {
    cdpedido: string
    nrdocumento: string
    dtemissao: string
    monthKey: string
    nmrepresentantevenda: string
    nmempresacurtovenda: string
    tpmovimentooperacao: string
    qtdsku: number
    vlfaturamento: number
    vltotalcustoproduto: number
    margem: number
    items: ClientSale[]
}

interface MonthlyData {
    month: string
    value: number
}

type SortField = 'qtdsku' | 'vlfaturamento' | 'vltotalcustoproduto' | 'margem' | 'dtemissao'
type SortOrder = 'asc' | 'desc'

const ITEMS_PER_PAGE = 20

// Add these utility functions before the ClientDetails component
const groupOrders = (sales: ClientSale[]) => {
    const orderMap = new Map<string, GroupedOrder>();

    sales.forEach(sale => {
        const key = `${sale.cdpedido}-${sale.nrdocumento}`;
        const [day, month, year] = sale.dtemissao.split('/')
        const monthKey = `${month}/${year}`

        if (!orderMap.has(key)) {
            orderMap.set(key, {
                cdpedido: sale.cdpedido,
                nrdocumento: sale.nrdocumento,
                dtemissao: sale.dtemissao,
                monthKey,
                nmrepresentantevenda: sale.nmrepresentantevenda,
                nmempresacurtovenda: sale.nmempresacurtovenda,
                tpmovimentooperacao: sale.tpmovimentooperacao,
                qtdsku: 0,
                vlfaturamento: 0,
                vltotalcustoproduto: 0,
                margem: 0,
                items: []
            });
        }
        
        const order = orderMap.get(key)!;
        order.items.push(sale);
        order.qtdsku += sale.qtbrutaproduto;
        order.vlfaturamento += sale.vlfaturamento;
        order.vltotalcustoproduto += sale.vltotalcustoproduto;
    });

    // Calculate margin for each order
    orderMap.forEach(order => {
        order.margem = ((order.vlfaturamento - (order.vlfaturamento * 0.268 + order.vltotalcustoproduto)) / order.vlfaturamento) * 100;
    });

    return Array.from(orderMap.values());
};

const getMonthlyData = (orders: GroupedOrder[]): MonthlyData[] => {
    const monthlyMap = new Map<string, number>();
    
    orders.forEach(order => {
        const [day, month, year] = order.dtemissao.split('/');
        const monthKey = `${year}-${month}`;
        monthlyMap.set(monthKey, (monthlyMap.get(monthKey) || 0) + order.vlfaturamento);
    });

    return Array.from(monthlyMap.entries())
        .map(([month, value]) => ({
            month: month.split('-').reverse().join('/'),
            value
        }))
        .sort((a, b) => {
            const [monthA, yearA] = a.month.split('/');
            const [monthB, yearB] = b.month.split('/');
            return (yearA + monthA).localeCompare(yearB + monthB);
        });
};

const getYearlyComparison = (orders: GroupedOrder[]) => {
    const currentYear = new Date().getFullYear();
    const lastYear = currentYear - 1;

    const yearlyTotals = orders.reduce((acc, order) => {
        const [, , year] = order.dtemissao.split('/');
        const orderYear = parseInt(year);
        
        if (orderYear === currentYear) {
            acc.currentYear += order.vlfaturamento;
        } else if (orderYear === lastYear) {
            acc.lastYear += order.vlfaturamento;
        }
        
        return acc;
    }, { currentYear: 0, lastYear: 0 });

    const percentageChange = yearlyTotals.lastYear > 0
        ? ((yearlyTotals.currentYear - yearlyTotals.lastYear) / yearlyTotals.lastYear) * 100
        : 0;

    return {
        currentYear: yearlyTotals.currentYear,
        lastYear: yearlyTotals.lastYear,
        percentageChange
    };
};

const getYearlyTotals = (orders: GroupedOrder[]) => {
    return orders.reduce((acc, order) => {
        const year = order.dtemissao.split('/')[2];
        acc[year] = (acc[year] || 0) + order.vlfaturamento;
        return acc;
    }, {} as Record<string, number>);
};

// Adicione a interface para orçamentos
interface ClientQuotation {
    dtemissao: string
    cdpedidodevenda: string
    nmempresacurtovenda: string
    nmrepresentantevenda: string
    qtd_produtos: number
    total_preco_venda: number
    total_faturamento: number
    total_preco_custo: number
    total_custo_produto: number
    percentualdisponivel: number
}

export default function ClientDetails() {
    const router = useRouter()
    const params = useParams()
    const searchParams = useSearchParams()
    const [data, setData] = useState<GroupedOrder[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [sortField, setSortField] = useState<SortField>('dtemissao')
    const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
    const [currentPage, setCurrentPage] = useState(1)
    const [selectedMonth, setSelectedMonth] = useState<string | null>(null)
    const [recentQuotations, setRecentQuotations] = useState<ClientQuotation[]>([])
    const [loadingQuotations, setLoadingQuotations] = useState(false)

    const filteredData = useMemo(() => {
        if (!selectedMonth) return data;
        return data.filter(order => {
            const [, month, year] = order.dtemissao.split('/')
            const orderMonth = `${month}/${year}`
            return orderMonth === selectedMonth
        });
    }, [data, selectedMonth]);

    const sortedData = useMemo(() => {
        return [...filteredData].sort((a, b) => {
            const multiplier = sortOrder === 'asc' ? 1 : -1;
            
            if (sortField === 'dtemissao') {
                const [dayA, monthA, yearA] = a.dtemissao.split('/');
                const [dayB, monthB, yearB] = b.dtemissao.split('/');
                const dateA = new Date(+yearA, +monthA - 1, +dayA);
                const dateB = new Date(+yearB, +monthB - 1, +dayB);
                return multiplier * (dateA.getTime() - dateB.getTime());
            }

            if (sortField === 'qtdsku') {
                return multiplier * (a.qtdsku - b.qtdsku);
            }

            if (sortField === 'vlfaturamento') {
                return multiplier * (a.vlfaturamento - b.vlfaturamento);
            }

            if (sortField === 'vltotalcustoproduto') {
                return multiplier * (a.vltotalcustoproduto - b.vltotalcustoproduto);
            }

            if (sortField === 'margem') {
                return multiplier * (a.margem - b.margem);
            }
            
            return 0;
        });
    }, [filteredData, sortField, sortOrder]);

    const paginatedData = useMemo(() => {
        return sortedData.slice(
            (currentPage - 1) * ITEMS_PER_PAGE,
            currentPage * ITEMS_PER_PAGE
        );
    }, [sortedData, currentPage]);

    const totalPages = useMemo(() => 
        Math.ceil(sortedData.length / ITEMS_PER_PAGE)
    , [sortedData]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const nmpessoa = params?.nmpessoa as string
                if (!nmpessoa) {
                    throw new Error('Nome do cliente não encontrado')
                }

                const url = `/api/cliente/${encodeURIComponent(nmpessoa)}`
                console.log('Fetching data from:', url)
                console.log('Client name:', {
                    original: nmpessoa,
                    encoded: encodeURIComponent(nmpessoa),
                    decoded: decodeURIComponent(encodeURIComponent(nmpessoa))
                })

                const response = await fetch(url)
                console.log('Response status:', response.status)
                
                const contentType = response.headers.get('content-type')
                console.log('Response content type:', contentType)

                const responseData = await response.json()
                console.log('Response data:', responseData)

                if (!response.ok) {
                    throw new Error(
                        responseData.details || 
                        responseData.error || 
                        'Failed to fetch client sales'
                    )
                }

                if (!Array.isArray(responseData)) {
                    console.error('Unexpected response format:', responseData)
                    throw new Error('Invalid response format from server')
                }

                const groupedOrders = groupOrders(responseData)
                console.log('Grouped orders:', groupedOrders)

                setData(groupedOrders)
            } catch (err) {
                const error = err as Error
                console.error('Error details:', {
                    message: error.message,
                    stack: error.stack
                })
                setError(error.message || 'Failed to fetch client sales')
            } finally {
                setIsLoading(false)
            }
        }

        fetchData()
    }, [params])

    useEffect(() => {
        setCurrentPage(1)
    }, [sortField, sortOrder])

    const handleBack = () => {
        const returnUrl = searchParams.get('returnUrl')
        if (returnUrl) {
            router.push(returnUrl)
        } else {
            router.back()
        }
    }

    const handleMonthClick = (props: any) => {
        if (props && props.activeLabel) {
            const clickedMonth = props.activeLabel;
            setSelectedMonth(prevMonth => prevMonth === clickedMonth ? null : clickedMonth);
            setCurrentPage(1);
        }
    };

    // Função para buscar orçamentos recentes
    const fetchRecentQuotations = async (clientName: string) => {
        setLoadingQuotations(true)
        try {
            const response = await fetch(`/api/quotations/client/${encodeURIComponent(clientName)}?limit=10`)
            if (!response.ok) {
                throw new Error('Failed to fetch client quotations')
            }
            const data = await response.json()
            setRecentQuotations(data)
        } catch (error) {
            console.error('Error fetching client quotations:', error)
        } finally {
            setLoadingQuotations(false)
        }
    }

    // Adicionar ao useEffect existente que carrega os dados do cliente
    useEffect(() => {
        if (params?.nmpessoa) {
            fetchRecentQuotations(params.nmpessoa as string)
        }
    }, [params?.nmpessoa])

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

    // Calculate totals from grouped orders
    const totals = data.reduce((acc, order) => ({
        faturamento: acc.faturamento + order.vlfaturamento,
        quantidade: acc.quantidade + order.qtdsku,
        pedidos: acc.pedidos + 1
    }), { faturamento: 0, quantidade: 0, pedidos: 0 })

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

    return (
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
                {decodeURIComponent(params?.nmpessoa as string)}
            </h1>

            <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-3">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-medium">
                            Total de Pedidos
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {totals.pedidos}
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
                            {totals.quantidade}
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
                                    }).format(totals.faturamento)
                                    : totals.faturamento.toLocaleString('pt-BR', {
                                        style: 'currency',
                                        currency: 'BRL'
                                    })
                                }
                            </div>
                            <div className="space-y-1">
                                {Object.entries(getYearlyTotals(data))
                                    .sort((a, b) => b[0].localeCompare(a[0])) // Sort years in descending order
                                    .map(([year, value]) => (
                                        <div key={year} className="text-xs text-muted-foreground">
                                            {year}: {new Intl.NumberFormat('pt-BR', {
                                                notation: 'compact',
                                                compactDisplay: 'short',
                                                style: 'currency',
                                                currency: 'BRL',
                                                maximumFractionDigits: 2
                                            }).format(value).replace('bi', 'B').replace('mil', 'K')}
                                        </div>
                                    ))
                                }
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="col-span-1 md:col-span-1 lg:col-span-1">
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
                                    }).format(getYearlyComparison(data).currentYear)
                                    : getYearlyComparison(data).currentYear.toLocaleString('pt-BR', {
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
                                    }).format(getYearlyComparison(data).lastYear)
                                    : getYearlyComparison(data).lastYear.toLocaleString('pt-BR', {
                                        style: 'currency',
                                        currency: 'BRL'
                                    })
                                }
                            </div>
                            <div className={`text-md md:text-sm lg:text-lg font-bold ${
                                getYearlyComparison(data).percentageChange >= 0 
                                    ? 'text-green-600 dark:text-green-400' 
                                    : 'text-red-600 dark:text-red-400'
                            }`}>
                                {getYearlyComparison(data).percentageChange >= 0 ? '↑' : '↓'}{' '}
                                {Math.abs(getYearlyComparison(data).percentageChange).toFixed(1)}%
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="col-span-2 md:col-span-2 lg:col-span-4">
                    <CardHeader>
                        <div className="h-8 flex justify-between items-center">
                            <CardTitle className="text-sm font-medium">
                                Evolução do Faturamento
                            </CardTitle>
                            {selectedMonth ? (
                                <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => setSelectedMonth(null)}
                                    className="text-muted-foreground"
                                >
                                    <X className="h-4 w-4 mr-2" />
                                    Limpar filtro: {selectedMonth}
                                </Button>
                            ) : (
                                <div className="invisible">
                                    <Button 
                                        variant="ghost" 
                                        size="sm"
                                        className="opacity-0"
                                    >
                                        <X className="h-4 w-4 mr-2" />
                                        Placeholder
                                    </Button>
                                </div>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[200px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart
                                    data={getMonthlyData(data)}
                                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                                    onClick={handleMonthClick}
                                >
                                    <defs>
                                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
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
                                    <Area
                                        key="value-area"
                                        type="monotone"
                                        dataKey="value"
                                        stroke="#2563eb"
                                        strokeWidth={2}
                                        fill="url(#colorValue)"
                                        dot={(props: any) => {
                                            const isSelected = selectedMonth && props.payload.month === selectedMonth
                                            return (
                                                <circle
                                                    key={`dot-${props.payload.month}`}
                                                    r={isSelected ? 6 : 4}
                                                    fill={isSelected ? "#2563eb" : "#fff"}
                                                    stroke="#2563eb"
                                                    strokeWidth={isSelected ? 3 : 2}
                                                    cx={props.cx}
                                                    cy={props.cy}
                                                    className={cn(
                                                        "transition-all duration-200",
                                                        isSelected && "drop-shadow-md"
                                                    )}
                                                />
                                            )
                                        }}
                                        activeDot={{
                                            key: "active-dot",
                                            r: 6,
                                            stroke: "#2563eb",
                                            strokeWidth: 2,
                                            fill: "#fff",
                                            className: "drop-shadow-md"
                                        }}
                                    />
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
                            <div className="min-w-[800px]">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="hover:bg-transparent">
                                            <TableHead className="py-1 text-sm">Data</TableHead>
                                            <TableHead className="py-1 text-sm">Código</TableHead>
                                            <TableHead className="py-1 text-sm">Filial</TableHead>
                                            <TableHead className="py-1 text-sm">Vendedor</TableHead>
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
                                                        {quotation.cdpedidodevenda}
                                                    </TableCell>
                                                    <TableCell className="py-1 text-sm">
                                                        {quotation.nmempresacurtovenda}
                                                    </TableCell>
                                                    <TableCell className="py-1 text-sm">
                                                        {quotation.nmrepresentantevenda}
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
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>
                        Histórico de Pedidos
                        {selectedMonth && (
                            <span className="ml-2 text-sm font-normal text-muted-foreground">
                                Filtrado por: {selectedMonth}
                            </span>
                        )}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <div className="overflow-x-auto">
                            <div className="min-w-[900px] max-h-[500px] overflow-y-auto">
                                <Table>
                                    <TableHeader className="sticky top-0 bg-background z-10">
                                        <TableRow>
                                            <TableHead>
                                                <Button
                                                    variant="ghost"
                                                    className="w-full flex items-center justify-between"
                                                    onClick={() => {
                                                        setSortOrder(sortField === 'dtemissao' && sortOrder === 'asc' ? 'desc' : 'asc');
                                                        setSortField('dtemissao');
                                                    }}
                                                >
                                                    Data
                                                    <ArrowUpDown className="h-4 w-4" />
                                                </Button>
                                            </TableHead>
                                            <TableHead>Pedido</TableHead>
                                            <TableHead>Doc.</TableHead>
                                            <TableHead>Vendedor</TableHead>
                                            <TableHead>Empresa</TableHead>
                                            <TableHead>Tipo</TableHead>
                                            <TableHead>
                                                <Button
                                                    variant="ghost"
                                                    className="w-full flex items-center justify-between"
                                                    onClick={() => {
                                                        setSortOrder(sortField === 'qtdsku' && sortOrder === 'asc' ? 'desc' : 'asc');
                                                        setSortField('qtdsku');
                                                    }}
                                                >
                                                    Qtd
                                                    <ArrowUpDown className="h-4 w-4" />
                                                </Button>
                                            </TableHead>
                                            <TableHead>
                                                <Button
                                                    variant="ghost"
                                                    className="w-full flex items-center justify-between"
                                                    onClick={() => {
                                                        setSortOrder(sortField === 'vlfaturamento' && sortOrder === 'asc' ? 'desc' : 'asc');
                                                        setSortField('vlfaturamento');
                                                    }}
                                                >
                                                    Fat.
                                                    <ArrowUpDown className="h-4 w-4" />
                                                </Button>
                                            </TableHead>
                                            <TableHead>
                                                <Button
                                                    variant="ghost"
                                                    className="w-full flex items-center justify-between"
                                                    onClick={() => {
                                                        setSortOrder(sortField === 'vltotalcustoproduto' && sortOrder === 'asc' ? 'desc' : 'asc');
                                                        setSortField('vltotalcustoproduto');
                                                    }}
                                                >
                                                    Custo
                                                    <ArrowUpDown className="h-4 w-4" />
                                                </Button>
                                            </TableHead>
                                            <TableHead>
                                                <Button
                                                    variant="ghost"
                                                    className="w-full flex items-center justify-between"
                                                    onClick={() => {
                                                        setSortOrder(sortField === 'margem' && sortOrder === 'asc' ? 'desc' : 'asc');
                                                        setSortField('margem');
                                                    }}
                                                >
                                                    Margem
                                                    <ArrowUpDown className="h-4 w-4" />
                                                </Button>
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody className={roboto.className}>
                                        {paginatedData.map((order, index) => (
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
                                                        href={`/vendedor/${encodeURIComponent(order.nmrepresentantevenda)}?returnUrl=${encodeURIComponent(window.location.pathname)}`}
                                                        className="text-blue-500 hover:text-blue-700 underline"
                                                    >
                                                        {order.nmrepresentantevenda}
                                                    </Link>
                                                </TableCell>
                                                <TableCell>{order.nmempresacurtovenda}</TableCell>
                                                <TableCell>{order.tpmovimentooperacao}</TableCell>
                                                <TableCell className="text-right">{order.qtdsku}</TableCell>
                                                <TableCell className="text-right">
                                                    {order.vlfaturamento.toLocaleString('pt-BR', {
                                                        style: 'currency',
                                                        currency: 'BRL'
                                                    })}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {order.vltotalcustoproduto.toLocaleString('pt-BR', {
                                                        style: 'currency',
                                                        currency: 'BRL'
                                                    })}
                                                </TableCell>
                                                <TableCell 
                                                    className={`text-right ${
                                                        order.margem >= 0 
                                                            ? 'text-green-600 dark:text-green-400' 
                                                            : 'text-red-600 dark:text-red-400'
                                                    }`}
                                                >
                                                    {order.margem.toFixed(2)}%
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                        <PaginationControls />
                    </div>
                </CardContent>
            </Card>
        </div>
    )
} 