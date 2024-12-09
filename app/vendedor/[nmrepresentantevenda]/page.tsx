'use client'
import { PermissionGuard } from '@/components/guards/permission-guard'
import { useState, useEffect } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { ArrowLeft, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react'
import Loading from '../../vendas-dia/loading'
import Link from 'next/link'
import { Roboto } from 'next/font/google'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

const roboto = Roboto({
    weight: ['400', '500', '700'],
    subsets: ['latin'],
    display: 'swap',
})

// Reuse the same interfaces from the client page
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

// Add these helper functions before the SalesmanDetails component

const getMonthlyData = (orders: GroupedOrder[]): MonthlyData[] => {
    const monthlyMap = new Map<string, number>()
    
    orders.forEach(order => {
        const [day, month, year] = order.dtemissao.split('/')
        const monthKey = `${year}-${month}`
        monthlyMap.set(monthKey, (monthlyMap.get(monthKey) || 0) + order.vlfaturamento)
    })

    // Convert to array and sort by date
    return Array.from(monthlyMap.entries())
        .map(([month, value]) => ({
            month: month.split('-').reverse().join('/'), // Convert YYYY-MM to MM/YYYY
            value
        }))
        .sort((a, b) => {
            const [monthA, yearA] = a.month.split('/')
            const [monthB, yearB] = b.month.split('/')
            return (yearA + monthA).localeCompare(yearB + monthB)
        })
}

const getYearlyComparison = (orders: GroupedOrder[]) => {
    const currentYear = new Date().getFullYear()
    const lastYear = currentYear - 1

    const yearlyTotals = orders.reduce((acc, order) => {
        const [, , year] = order.dtemissao.split('/')
        const orderYear = parseInt(year)
        
        if (orderYear === currentYear) {
            acc.currentYear += order.vlfaturamento
        } else if (orderYear === lastYear) {
            acc.lastYear += order.vlfaturamento
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
        acc[year] = (acc[year] || 0) + order.vlfaturamento
        return acc
    }, {} as Record<string, number>)
}

export default function SalesmanDetails() {
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

    // Reuse the same helper functions from the client page
    const groupOrders = (sales: ClientSale[]) => {
        const orderMap = new Map<string, {
            cdpedido: string
            nrdocumento: string
            dtemissao: string
            nmpessoa: string
            nmempresacurtovenda: string
            tpmovimentooperacao: string
            qtdsku: number
            vlfaturamento: number
            vltotalcustoproduto: number
            margem: number
            items: ClientSale[]
        }>();

        sales.forEach(sale => {
            const key = `${sale.cdpedido}-${sale.nrdocumento}`;
            if (!orderMap.has(key)) {
                orderMap.set(key, {
                    cdpedido: sale.cdpedido,
                    nrdocumento: sale.nrdocumento,
                    dtemissao: sale.dtemissao,
                    nmpessoa: sale.nmpessoa,
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

        orderMap.forEach(order => {
            order.margem = ((order.vlfaturamento - (order.vlfaturamento * 0.268 + order.vltotalcustoproduto)) / order.vlfaturamento) * 100;
        });

        return Array.from(orderMap.values());
    };

    // Reuse the same data fetching logic but with the new endpoint
    useEffect(() => {
        const fetchData = async () => {
            try {
                const nmrepresentantevenda = params?.nmrepresentantevenda as string
                if (!nmrepresentantevenda) {
                    throw new Error('Nome do vendedor não encontrado')
                }

                const url = `/api/vendedor/${encodeURIComponent(nmrepresentantevenda)}`
                const response = await fetch(url)
                const responseData = await response.json()

                if (!response.ok) {
                    throw new Error(
                        responseData.details || 
                        responseData.error || 
                        'Failed to fetch salesman sales'
                    )
                }

                if (!Array.isArray(responseData)) {
                    throw new Error('Invalid response format from server')
                }

                const groupedOrders = groupOrders(responseData)
                setData(groupedOrders)
            } catch (err) {
                const error = err as Error
                setError(error.message || 'Failed to fetch salesman sales')
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

    const sortedData = [...data].sort((a, b) => {
        const multiplier = sortOrder === 'asc' ? 1 : -1

        if (sortField === 'dtemissao') {
            // Convert DD/MM/YYYY to YYYY-MM-DD for proper date comparison
            const dateA = a.dtemissao.split('/').reverse().join('-')
            const dateB = b.dtemissao.split('/').reverse().join('-')
            return multiplier * (new Date(dateA).getTime() - new Date(dateB).getTime())
        }

        return (a[sortField] - b[sortField]) * multiplier
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
                {decodeURIComponent(params?.nmrepresentantevenda as string)}
            </h1>

            <div className="grid gap-4 grid-cols-3 md:grid-cols-2 lg:grid-cols-3">
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

                <Card className="col-span-3 md:col-span-1 lg:col-span-1">
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
                            <div className={`text-md md:text-sm lg:text-lg font-bold ${getYearlyComparison(data).percentageChange >= 0
                                    ? 'text-green-600 dark:text-green-400'
                                    : 'text-red-600 dark:text-red-400'
                                }`}>
                                {getYearlyComparison(data).percentageChange >= 0 ? '↑' : '↓'}{' '}
                                {Math.abs(getYearlyComparison(data).percentageChange).toFixed(1)}%
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="col-span-3 md:col-span-3 lg:col-span-4">
                    <CardHeader>
                        <CardTitle className="text-sm font-medium">
                            Evolução do Faturamento
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[200px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart
                                    data={getMonthlyData(data)}
                                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                                >
                                    <defs>
                                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
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
                                        type="monotone"
                                        dataKey="value"
                                        stroke="#2563eb"
                                        strokeWidth={2}
                                        fill="url(#colorValue)"
                                        dot={{ r: 4, fill: "#2563eb" }}
                                        activeDot={{ r: 6 }}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Histórico de Pedidos</CardTitle>
                </CardHeader>
                <CardContent>
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
                                            if (sortField === 'vlfaturamento') {
                                                setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                                            } else {
                                                setSortField('vlfaturamento')
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
                                            if (sortField === 'vltotalcustoproduto') {
                                                setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                                            } else {
                                                setSortField('vltotalcustoproduto')
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
                                    <TableCell>{order.nmpessoa}</TableCell>
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
                                        className={`text-right ${order.margem >= 0
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
                    <PaginationControls />
                </CardContent>
            </Card>
        </div>
        </PermissionGuard>
    )
} 