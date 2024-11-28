'use client'

import { Roboto } from 'next/font/google'
import './styles.css'
import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { RefreshCw, Download, ArrowUpDown, ArrowUp, ArrowDown, X, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Settings2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DailySale } from '@/types/sales'
import Loading from './loading'
import * as XLSX from 'xlsx'
import {
    ColumnDef,
    flexRender,
    getCoreRowModel,
    getSortedRowModel,
    getPaginationRowModel,
    SortingState,
    useReactTable,
} from '@tanstack/react-table'
import Link from 'next/link'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { format } from 'date-fns'
import { Calendar as CalendarIcon } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { ptBR } from 'date-fns/locale'
import { addDays, subDays } from 'date-fns'
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react'
import { DateRange } from "react-day-picker"
import { openDB, IDBPDatabase } from 'idb'
import { DataExtracao } from '@/components/data-extracao'
import { ExpandableRow } from '@/components/ui/expandable-row'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { useMediaQuery } from '@/hooks/use-media-query'

// Initialize the font
const roboto = Roboto({
  weight: ['400', '500', '700'],
  subsets: ['latin'],
  display: 'swap',
})

// Move parseDate outside the component
const parseDate = (dateString: string): Date => {
    const [year, month, day] = dateString.split('-').map(Number)
    return new Date(year, month - 1, day, 12, 0, 0)
}

interface CachedData {
    data: DailySale[]
    timestamp: number
    queryDate: string
}

const CACHE_DURATION = 60 * 60 * 1000 // 60 minutes in milliseconds
const DB_NAME = 'sales-cache'
const STORE_NAME = 'daily-sales'

async function initDB(): Promise<IDBPDatabase> {
    return openDB(DB_NAME, 1, {
        upgrade(db) {
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME)
            }
        },
    })
}

async function getCachedData(queryDate: string): Promise<CachedData | null> {
    try {
        const db = await initDB()
        const data = await db.get(STORE_NAME, queryDate)
        return data || null
    } catch (error) {
        console.error('Error reading from cache:', error)
        return null
    }
}

async function setCachedData(queryDate: string, data: DailySale[]): Promise<void> {
    try {
        const db = await initDB()
        await db.put(STORE_NAME, {
            data,
            timestamp: Date.now(),
            queryDate
        }, queryDate)
    } catch (error) {
        console.error('Error writing to cache:', error)
    }
}

// Add this helper function to check if dates are the same day
const isSameDay = (date1: Date, date2: Date): boolean => {
    return (
        date1.getFullYear() === date2.getFullYear() &&
        date1.getMonth() === date2.getMonth() &&
        date1.getDate() === date2.getDate()
    )
}

// Add this helper function near the top of your component
const getColumnDisplayName = (column: any) => {
    if (typeof column.columnDef.header === 'string') {
        return column.columnDef.header
    }
    
    // Map column IDs to display names
    const displayNames: Record<string, string> = {
        'cdpedido': 'Pedido',
        'nrdocumento': 'Documento',
        'nmpessoa': 'Cliente',
        'nmrepresentantevenda': 'Vendedor',
        'nmempresacurtovenda': 'Empresa',
        'tpmovimentooperacao': 'Tipo',
        'qtdsku': 'Qtd SKUs',
        'total_faturamento': 'Faturamento',
        'total_custo_produto': 'Custo',
        'margem': 'Margem'
    }

    return displayNames[column.id] || column.id
}

export default function DailySales() {
    const router = useRouter()
    const searchParams = useSearchParams()

    const [data, setData] = useState<DailySale[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [sorting, setSorting] = useState<SortingState>(() => {
        const sortField = searchParams.get('sortField')
        const sortDir = searchParams.get('sortDir')
        if (sortField && sortDir) {
            return [{
                id: sortField,
                desc: sortDir === 'desc'
            }]
        }
        return []
    })
    const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '')
    const [pagination, setPagination] = useState({
        pageIndex: 0,
        pageSize: 20,
    })
    const [empresaFilter, setEmpresaFilter] = useState(searchParams.get('empresa') || 'all')
    const [dateRange, setDateRange] = useState<DateRange>(() => {
        const dateParam = searchParams.get('date')
        const endDateParam = searchParams.get('endDate')

        const normalizedDate = dateParam ? new Date(parseDate(dateParam).setHours(12, 0, 0, 0)) : new Date(new Date().setHours(12, 0, 0, 0))
        const normalizedEndDate = endDateParam ? new Date(parseDate(endDateParam).setHours(12, 0, 0, 0)) : undefined

        return {
            from: normalizedDate,
            to: normalizedEndDate
        }
    })
    const [columnVisibility, setColumnVisibility] = useState({})
    const [columnOrder, setColumnOrder] = useState<string[]>([])
    const [showBackToTop, setShowBackToTop] = useState(false)
    const isMobile = useMediaQuery("(max-width: 1024px)")
    const [showRightFade, setShowRightFade] = useState(true)
    const [scrollFade, setScrollFade] = useState({ left: false, right: true })

    const columns = useMemo<ColumnDef<DailySale>[]>(() => [
        {
            accessorKey: 'cdpedido',
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                    Ped.
                    {column.getIsSorted() === "asc" ? (
                        <ArrowUp className="ml-2 h-4 w-4" />
                    ) : column.getIsSorted() === "desc" ? (
                        <ArrowDown className="ml-2 h-4 w-4" />
                    ) : (
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    )}
                </Button>
            ),
            cell: ({ row }) => (
                <Link
                    href={`/vendas-dia/${row.original.cdpedido}?nrdocumento=${row.original.nrdocumento}&dtemissao=${row.original.dtemissao}`}
                    className="text-blue-500 hover:text-blue-700 underline text-xs"
                >
                    {row.original.cdpedido}
                </Link>
            ),
        },
        {
            accessorKey: 'nrdocumento',
            header: "Doc.",
        },
        {
            accessorKey: 'nmpessoa',
            header: "Cliente",
        },
        {
            accessorKey: 'nmrepresentantevenda',
            header: "Vendedor",
        },
        {
            accessorKey: 'nmempresacurtovenda',
            header: "Empresa",
            cell: ({ row }) => row.original.nmempresacurtovenda,
            enableSorting: true,
        },
        {
            accessorKey: 'tpmovimentooperacao',
            header: "Tipo",
        },
        {
            accessorKey: 'qtdsku',
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                    Qtd SKUs
                    {column.getIsSorted() === "asc" ? (
                        <ArrowUp className="ml-2 h-4 w-4" />
                    ) : column.getIsSorted() === "desc" ? (
                        <ArrowDown className="ml-2 h-4 w-4" />
                    ) : (
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    )}
                </Button>
            ),
            cell: ({ row }) => (
                <div className="text-center">
                    {row.original.qtdsku.toLocaleString('pt-BR')}
                </div>
            ),
        },
        {
            accessorKey: 'total_faturamento',
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                    Fat.
                    {column.getIsSorted() === "asc" ? (
                        <ArrowUp className="ml-2 h-4 w-4" />
                    ) : column.getIsSorted() === "desc" ? (
                        <ArrowDown className="ml-2 h-4 w-4" />
                    ) : (
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    )}
                </Button>
            ),
            cell: ({ row }) => row.original.total_faturamento.toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL'
            }),
        },
        {
            accessorKey: 'total_custo_produto',
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                    Custo
                    {column.getIsSorted() === "asc" ? (
                        <ArrowUp className="ml-2 h-4 w-4" />
                    ) : column.getIsSorted() === "desc" ? (
                        <ArrowDown className="ml-2 h-4 w-4" />
                    ) : (
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    )}
                </Button>
            ),
            cell: ({ row }) => row.original.total_custo_produto.toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL'
            }),
        },
        {
            accessorKey: 'margem',
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                    Margem
                    {column.getIsSorted() === "asc" ? (
                        <ArrowUp className="ml-2 h-4 w-4" />
                    ) : column.getIsSorted() === "desc" ? (
                        <ArrowDown className="ml-2 h-4 w-4" />
                    ) : (
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    )}
                </Button>
            ),
            cell: ({ row }) => {
                const margin = parseFloat(row.original.margem);
                let color;
                if (margin < 0) {
                    color = 'text-red-600';
                } else if (margin <= 3) {
                    color = 'text-yellow-700';
                } else {
                    color = 'text-green-600';
                }
                return (
                    <div className="text-right">
                        <span className={`font-bold ${color}`}>
                            {margin.toFixed(2)}%
                        </span>
                    </div>
                );
            },
        },
    ], [])

    const fetchData = async (force: boolean = false) => {
        try {
            setError(null)
            if (force) {
                setIsRefreshing(true)
            }

            let queryDate: string
            if (dateRange.to) {
                const startDate = dateRange.from
                const endDate = dateRange.to

                if (startDate && endDate) {
                    const dates: Date[] = []
                    let currentDate = new Date(Math.min(startDate.getTime(), endDate.getTime()))
                    const finalDate = new Date(Math.max(startDate.getTime(), endDate.getTime()))

                    while (currentDate <= finalDate) {
                        dates.push(new Date(currentDate))
                        currentDate.setDate(currentDate.getDate() + 1)
                    }

                    queryDate = `in.(${dates.map(d => format(d, 'dd/MM/yyyy')).join(',')})`
                }
            } else if (dateRange.from) {
                queryDate = `eq.${format(dateRange.from, 'dd/MM/yyyy')}`
            } else {
                queryDate = `eq.${format(new Date(), 'dd/MM/yyyy')}`
            }

            // Check cache first if not forcing refresh
            if (!force) {
                const cachedData = await getCachedData(queryDate)
                if (cachedData && (Date.now() - cachedData.timestamp) < CACHE_DURATION) {
                    setData(cachedData.data)
                    setLastUpdate(new Date(cachedData.timestamp))
                    setIsLoading(false)
                    setIsRefreshing(false)
                    return
                }
            }

            const response = await fetch(`/api/vendas-dia?date=${encodeURIComponent(queryDate)}`)
            if (!response.ok) {
                throw new Error('Failed to fetch sales data')
            }

            const salesData = await response.json()

            // Cache the new data
            await setCachedData(queryDate, salesData)

            setData(salesData)
            setLastUpdate(new Date())
        } catch (error) {
            console.error('Error fetching sales data:', error)
            setError(error instanceof Error ? error.message : 'Failed to fetch sales data')
        } finally {
            setIsLoading(false)
            setIsRefreshing(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [dateRange])

    useEffect(() => {
        const dateParam = searchParams.get('date')
        const endDateParam = searchParams.get('endDate')

        if (dateParam) {
            setDateRange(prev => ({
                from: parseDate(dateParam),
                to: endDateParam ? parseDate(endDateParam) : prev.to
            }))
        }

        const searchParam = searchParams.get('search')
        if (searchParam) {
            setSearchTerm(searchParam)
        }

        const empresaParam = searchParams.get('empresa')
        if (empresaParam) {
            setEmpresaFilter(empresaParam)
        }

        const sortField = searchParams.get('sortField')
        const sortDir = searchParams.get('sortDir')
        if (sortField && sortDir) {
            setSorting([{
                id: sortField,
                desc: sortDir === 'desc'
            }])
        }
    }, [searchParams])

    const handleRefresh = () => {
        fetchData(true)
    }

    const handleExportXLSX = () => {
        // Get the filtered and sorted data from the table
        const exportData = table.getFilteredRowModel().rows.map(row => {
            const item = row.original;
            return {
                'Pedido': item.cdpedido,
                'Documento': item.nrdocumento,
                'Cliente': item.nmpessoa,
                'Representante': item.nmrepresentantevenda,
                'Empresa': item.nmempresacurtovenda,
                'Tipo': item.tpmovimentooperacao,
                'Qtd SKUs': item.qtdsku,
                'Faturamento': item.total_faturamento,
                'Custo': item.total_custo_produto,
                'Margem (%)': parseFloat(item.margem).toFixed(2)
            };
        });

        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        
        // Get the date range for the filename
        const dateStr = dateRange.to 
            ? `${format(dateRange.from!, 'dd-MM-yyyy')}_ate_${format(dateRange.to, 'dd-MM-yyyy')}` 
            : format(dateRange.from!, 'dd-MM-yyyy');
        
        // Add filters to filename if any are active
        const filters = [];
        if (empresaFilter !== 'all') filters.push(empresaFilter);
        if (searchTerm) filters.push(`busca-${searchTerm}`);
        
        const filterStr = filters.length > 0 ? `_${filters.join('_')}` : '';
        
        XLSX.utils.book_append_sheet(workbook, worksheet, "Vendas do Dia");
        XLSX.writeFile(workbook, `vendas-dia_${dateStr}${filterStr}.xlsx`);
    };

    const filteredData = useMemo(() => {
        let filtered = data;

        if (empresaFilter !== 'all') {
            filtered = filtered.filter(item =>
                item.nmempresacurtovenda === empresaFilter
            )
        }

        if (searchTerm) {
            const searchLower = searchTerm.toLowerCase()
            filtered = filtered.filter(item =>
                item.nmpessoa.toLowerCase().includes(searchLower) ||
                item.cdpedido.toLowerCase().includes(searchLower) ||
                item.nrdocumento.toLowerCase().includes(searchLower) ||
                item.nmrepresentantevenda.toLowerCase().includes(searchLower)
            )
        }

        return filtered
    }, [data, searchTerm, empresaFilter])

    const uniqueEmpresas = useMemo(() => {
        const empresas = [...new Set(data.map(item => item.nmempresacurtovenda))]
        return empresas.sort()
    }, [data])

    const table = useReactTable({
        data: filteredData,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        onSortingChange: (newSorting) => {
            setSorting(newSorting)
            updateSearchParams(dateRange.from, searchTerm, empresaFilter, newSorting, dateRange.to)
        },
        onColumnVisibilityChange: setColumnVisibility,
        onColumnOrderChange: setColumnOrder,
        onPaginationChange: setPagination,
        manualPagination: false,
        pageCount: Math.ceil(filteredData.length / pagination.pageSize),
        state: {
            sorting,
            pagination,
            columnVisibility,
            columnOrder,
        },
    })

    const updateSearchParams = (newDate?: Date, search?: string, empresa?: string, newSorting?: SortingState | ((prev: SortingState) => SortingState), endDate?: Date) => {
        const params = new URLSearchParams(searchParams.toString())

        if (newDate) {
            params.set('date', format(newDate, 'yyyy-MM-dd'))
            if (endDate) {
                params.set('endDate', format(endDate, 'yyyy-MM-dd'))
            } else {
                params.delete('endDate')
            }
        }

        if (search !== undefined) {
            if (search) {
                params.set('search', search)
            } else {
                params.delete('search')
            }
        }

        if (empresa !== undefined) {
            if (empresa !== 'all') {
                params.set('empresa', empresa)
            } else {
                params.delete('empresa')
            }
        }

        const sortingValue = typeof newSorting === 'function' ? newSorting(sorting) : newSorting

        if (sortingValue && sortingValue.length > 0) {
            params.set('sortField', sortingValue[0].id)
            params.set('sortDir', sortingValue[0].desc ? 'desc' : 'asc')
        } else {
            params.delete('sortField')
            params.delete('sortDir')
        }

        router.replace(`${window.location.pathname}?${params.toString()}`, { scroll: false })
    }

    const handleDateChange = (range: DateRange | undefined) => {
        if (!range) {
            return;
        }

        // Normalize dates to noon to avoid timezone issues
        const normalizedRange = {
            from: range.from ? new Date(range.from.setHours(12, 0, 0, 0)) : undefined,
            to: range.to ? new Date(range.to.setHours(12, 0, 0, 0)) : undefined
        }

        // If selecting a single day or if end date is before start date
        if (!normalizedRange.to || (normalizedRange.from && normalizedRange.to && normalizedRange.to < normalizedRange.from)) {
            const newRange = {
                from: normalizedRange.from,
                to: undefined
            }
            setDateRange(newRange)
            updateSearchParams(normalizedRange.from, searchTerm, empresaFilter, sorting)
            return;
        }

        // Normal range selection
        setDateRange(normalizedRange)
        updateSearchParams(normalizedRange.from, searchTerm, empresaFilter, sorting, normalizedRange.to)
    }

    const handlePreviousDay = () => {
        if (!dateRange.from) return;

        const newDate = new Date(subDays(dateRange.from, 1).setHours(12, 0, 0, 0))

        if (dateRange.to) {
            const newTo = dateRange.to
            setDateRange({
                from: newDate,
                to: newTo
            })
            updateSearchParams(newDate, searchTerm, empresaFilter, sorting, newTo)
        } else {
            setDateRange({
                from: newDate,
                to: undefined
            })
            updateSearchParams(newDate, searchTerm, empresaFilter, sorting)
        }
    }

    const handleNextDay = () => {
        if (!dateRange.from) return;

        const newDate = new Date(addDays(dateRange.from, 1).setHours(12, 0, 0, 0))

        if (dateRange.to) {
            if (newDate > dateRange.to) {
                const newTo = new Date(addDays(dateRange.to, 1).setHours(12, 0, 0, 0))
                setDateRange({
                    from: newDate,
                    to: newTo
                })
                updateSearchParams(newDate, searchTerm, empresaFilter, sorting, newTo)
            } else {
                setDateRange({
                    from: newDate,
                    to: dateRange.to
                })
                updateSearchParams(newDate, searchTerm, empresaFilter, sorting, dateRange.to)
            }
        } else {
            setDateRange({
                from: newDate,
                to: undefined
            })
            updateSearchParams(newDate, searchTerm, empresaFilter, sorting)
        }
    }

    const handleSearch = (value: string) => {
        setSearchTerm(value)
        updateSearchParams(dateRange.from, value, empresaFilter, sorting, dateRange.to)
    }

    const handleEmpresaFilter = (value: string) => {
        setEmpresaFilter(value)
        updateSearchParams(dateRange.from, searchTerm, value, sorting, dateRange.to)
    }

    const calculateMargin = (totalRevenue: number, totalCost: number) => {
        const margin = (totalRevenue - (totalRevenue * 0.268 + totalCost)) / totalRevenue * 100
        return margin
    }

    const getMarginStyle = (margin: number) => {
        if (margin > 3) {
            return {
                background: "linear-gradient(to right, hsl(142.1 76.2% 36.3%), hsl(143.8 71.8% 29.2%))",
                icon: <TrendingUp className="h-8 w-8 text-white" />,
                textColor: "text-white"
            }
        } else if (margin >= 0) {
            return {
                background: "linear-gradient(to right, hsl(47.9 95.8% 53.1%), hsl(46 96.2% 48.3%))",
                icon: <AlertTriangle className="h-8 w-8 text-white" />,
                textColor: "text-white"
            }
        } else {
            return {
                background: "linear-gradient(to right, hsl(0 72.2% 50.6%), hsl(0 72.2% 40.6%))",
                icon: <TrendingDown className="h-8 w-8 text-white" />,
                textColor: "text-white"
            }
        }
    }

    const companySummaries = useMemo(() => {
        const summaries = data.reduce((acc, item) => {
            if (!acc[item.nmempresacurtovenda]) {
                acc[item.nmempresacurtovenda] = {
                    faturamento: 0,
                    custo: 0,
                    count: 0
                }
            }
            acc[item.nmempresacurtovenda].faturamento += item.total_faturamento
            acc[item.nmempresacurtovenda].custo += item.total_custo_produto
            acc[item.nmempresacurtovenda].count += 1
            return acc
        }, {} as Record<string, { faturamento: number; custo: number; count: number }>)

        return Object.entries(summaries)
            .map(([empresa, values]) => ({
                empresa,
                ...values,
                margin: calculateMargin(values.faturamento, values.custo)
            }))
            .sort((a, b) => b.faturamento - a.faturamento)
    }, [data])

    const totalSummary = useMemo(() => {
        return companySummaries.reduce((acc, summary) => ({
            faturamento: acc.faturamento + summary.faturamento,
            custo: acc.custo + summary.custo,
            count: acc.count + summary.count,
            margin: 0 // será calculado abaixo
        }), {
            faturamento: 0,
            custo: 0,
            count: 0,
            margin: 0
        });
    }, [companySummaries]);

    // Calcular a margem total após ter os totais
    totalSummary.margin = calculateMargin(totalSummary.faturamento, totalSummary.custo);

    // Adicione este useEffect para lidar com o evento de teclado
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && empresaFilter !== 'all') {
                handleEmpresaFilter('all')
            }
        }

        window.addEventListener('keydown', handleKeyDown)

        // Cleanup do event listener
        return () => {
            window.removeEventListener('keydown', handleKeyDown)
        }
    }, [empresaFilter]) // Dependência do empresaFilter para ter acesso ao valor atual

    // Add this useEffect for scroll handling
    useEffect(() => {
        const handleScroll = () => {
            setShowBackToTop(window.scrollY > 400)
        }

        window.addEventListener('scroll', handleScroll)
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    // Add this function for scrolling to top
    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    const handleCardsScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const container = e.currentTarget
        const isAtEnd = container.scrollLeft + container.clientWidth >= container.scrollWidth - 10 // 10px threshold
        
        setScrollFade({
            right: !isAtEnd,
            left: isAtEnd // Only show left fade when we're at the end
        })
    }

    if (isLoading) {
        return <Loading />
    }

    return (
        <div className={`space-y-6 min-w-[300px] ${roboto.className}`}>
            <div className="flex flex-col gap-2">
                <div className="flex justify-center items-center flex-wrap gap-x-4">
                    <div className="flex flex-col">
                        <h1 className="text-3xl font-bold self-center">Vendas do Dia</h1>
                        {lastUpdate && (
                            <span className="text-xs text-muted-foreground">
                                Última atualização: {lastUpdate.toLocaleString('pt-BR')}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-4 mt-2">
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
                            variant="outline"
                            size="sm"
                            onClick={handleExportXLSX}
                        >
                            <Download className="h-4 w-4 mr-2" />
                            Exportar
                        </Button>
                    </div>
                </div>
                {error && (
                    <div className="bg-destructive/15 text-destructive px-4 py-3 rounded-lg">
                        {error}
                    </div>
                )}
            </div>

            <div className="flex items-center gap-4 justify-center">
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={handlePreviousDay}
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>

                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                className={cn(
                                    "min-w-[260px] justify-start text-left font-normal",
                                    !dateRange.from && "text-muted-foreground"
                                )}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {dateRange.from ? (
                                    <span className="font-medium">
                                        {dateRange.to ? (
                                            dateRange.to < dateRange.from ? (
                                                format(dateRange.from, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                                            ) : (
                                                isSameDay(dateRange.from, dateRange.to) ? (
                                                    format(dateRange.from, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                                                ) : (
                                                    `${format(dateRange.from, "dd 'de' MMMM", { locale: ptBR })} até ${format(dateRange.to, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}`
                                                )
                                            )
                                        ) : (
                                            format(dateRange.from, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                                        )}
                                    </span>
                                ) : (
                                    <span>Selecione uma data</span>
                                )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                mode="range"
                                selected={dateRange}
                                onSelect={handleDateChange}
                                initialFocus
                                locale={ptBR}
                                numberOfMonths={1}
                                disabled={{ after: new Date() }} // Prevent future date selection
                                defaultMonth={dateRange.from} // Keep the calendar centered on the selected month
                                className="rounded-md border"
                                classNames={{
                                    month: "space-y-4",
                                    caption: "flex justify-center pt-1 relative items-center",
                                    caption_label: "text-sm font-medium",
                                    nav: "space-x-1 flex items-center",
                                    nav_button: cn(
                                        "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
                                    ),
                                    table: "w-full border-collapse space-y-1",
                                    head_row: "flex",
                                    head_cell: "text-muted-foreground rounded-md w-8 font-normal text-[0.8rem]",
                                    row: "flex w-full mt-2",
                                    cell: "text-center text-sm p-0 relative [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                                    day: cn(
                                        "h-8 w-8 p-0 font-normal aria-selected:opacity-100 hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                                    ),
                                    day_selected:
                                        "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground rounded-md",
                                    day_today: "bg-accent text-accent-foreground",
                                    day_outside: "text-muted-foreground opacity-50",
                                    day_disabled: "text-muted-foreground opacity-50",
                                    day_range_middle:
                                        "aria-selected:bg-accent aria-selected:text-accent-foreground",
                                    day_hidden: "invisible",
                                }}
                            />
                        </PopoverContent>
                    </Popover>

                    <Button
                        variant="outline"
                        size="icon"
                        onClick={handleNextDay}
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            <div className="overflow-x-auto pb-4 -mx-6 px-6 md:overflow-visible md:-mx-0 md:px-0">
                <div className="relative">
                    {scrollFade.left && (
                        <>
                            <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-background to-transparent pointer-events-none z-10 xl:hidden" />
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/80 pointer-events-none z-10 animate-pulse-slow xl:hidden">
                                <ChevronLeft className="h-8 w-8" />
                            </div>
                        </>
                    )}
                    
                    {scrollFade.right && (
                        <>
                            <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-background to-transparent pointer-events-none z-10 xl:hidden" />
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground/80 pointer-events-none z-10 animate-pulse-slow xl:hidden">
                                <ChevronRight className="h-8 w-8" />
                            </div>
                        </>
                    )}
                    
                    <div 
                        className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide xl:justify-center"
                        onScroll={handleCardsScroll}
                    >
                        <div className="flex gap-4 px-6">
                            {/* Card Total - Only show if there's data */}
                            {totalSummary.count > 0 && (
                                <Card
                                    className={cn(
                                        "relative overflow-hidden snap-start shrink-0",
                                        "w-[calc(40vw-1.5rem)] md:w-[200px]"
                                    )}
                                >
                                    <div className="absolute top-0 right-0 w-24 h-24 -translate-y-8 translate-x-8 opacity-30">
                                        {totalSummary.margin >= 4 ? (
                                            <CheckCircle className="h-8 w-8 text-white" />
                                        ) : (
                                            <AlertTriangle className="h-8 w-8 text-white" />
                                        )}
                                    </div>
                                    <CardHeader className="p-4" style={{
                                        background: totalSummary.margin >= 4 
                                            ? "linear-gradient(to right, hsl(142.1 76.2% 36.3%), hsl(143.8 71.8% 29.2%))"
                                            : "linear-gradient(to right, hsl(47.9 95.8% 53.1%), hsl(46 96.2% 48.3%))"
                                    }}>
                                        <CardTitle className="text-sm flex items-center justify-between text-white">
                                            TOTAL GERAL
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-4 pt-0 space-y-2" style={{
                                        background: totalSummary.margin >= 4 
                                            ? "linear-gradient(to right, hsl(142.1 76.2% 36.3%), hsl(143.8 71.8% 29.2%))"
                                            : "linear-gradient(to right, hsl(47.9 95.8% 53.1%), hsl(46 96.2% 48.3%))"
                                    }}>
                                        <div className="flex justify-between items-center text-xs text-white">
                                            <span className="text-white/80">Pedidos</span>
                                            <span>{totalSummary.count}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-xs text-white">
                                            <span className="text-white/80">Fat.</span>
                                            <span>{totalSummary.faturamento.toLocaleString('pt-BR', {
                                                style: 'currency',
                                                currency: 'BRL'
                                            })}</span>
                                        </div>
                                        <div className="mt-2 p-2 rounded-md bg-white/10">
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs font-medium text-white">
                                                    Margem
                                                </span>
                                                <span className="text-sm font-bold text-white">
                                                    {totalSummary.margin.toFixed(2)}%
                                                </span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {companySummaries.map((summary) => {
                                const margin = (summary.faturamento - (summary.faturamento * 0.268 + summary.custo)) / summary.faturamento * 100;
                                const marginStyle = getMarginStyle(margin);
                                const isSelected = empresaFilter === summary.empresa;

                                return (
                                    <Card
                                        key={summary.empresa}
                                        className={cn(
                                            "relative overflow-hidden cursor-pointer transition-all duration-200 snap-start shrink-0",
                                            "w-[calc(40vw-1.5rem)] md:w-[200px]",
                                            isSelected
                                                ? "ring-2 ring-primary hover:ring-primary/70"
                                                : "hover:ring-2 hover:ring-primary/50 opacity-70 hover:opacity-100",
                                            empresaFilter !== 'all' && !isSelected && "opacity-50"
                                        )}
                                        onClick={() => handleEmpresaFilter(isSelected ? 'all' : summary.empresa)}
                                        title={isSelected ? "Pressione ESC para desselecionar" : undefined}
                                    >
                                        <div className={cn(
                                            "absolute top-0 right-0 w-24 h-24 -translate-y-8 translate-x-8",
                                            isSelected ? "opacity-30" : "opacity-20"
                                        )}>
                                            {marginStyle.icon}
                                        </div>
                                        <CardHeader className="p-4">
                                            <CardTitle className="text-xs flex items-center justify-between">
                                                {summary.empresa}
                                                {isSelected && (
                                                    <span className={`text-[10px] bg-primary/20 text-primary px-2 py-0 rounded-full ${roboto.className}`}>
                                                        Filtrado
                                                    </span>
                                                )}
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="p-4 pt-0 space-y-2">
                                            <div className="flex justify-between items-center text-xs">
                                                <span className="text-muted-foreground">Pedidos</span>
                                                <span>{summary.count}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-xs">
                                                <span className="text-muted-foreground">Fat.</span>
                                                <span>{summary.faturamento.toLocaleString('pt-BR', {
                                                    style: 'currency',
                                                    currency: 'BRL'
                                                })}</span>
                                            </div>
                                            <div className="mt-2 p-2 rounded-md" style={{ background: marginStyle.background }}>
                                                <div className="flex justify-between items-center">
                                                    <span className={cn("text-xs font-medium", marginStyle.textColor)}>
                                                        Margem
                                                    </span>
                                                    <span className={cn("text-sm font-bold", marginStyle.textColor)}>
                                                        {margin.toFixed(2)}%
                                                    </span>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <CardTitle className="text-md">
                            Lista de Vendas - {
                                dateRange.from && (
                                    dateRange.to ? (
                                        isSameDay(dateRange.from, dateRange.to) ? (
                                            format(dateRange.from, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                                        ) : (
                                            `${format(dateRange.from, "dd 'de' MMMM", { locale: ptBR })} até ${format(dateRange.to, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}`
                                        )
                                    ) : format(dateRange.from, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                                )
                            }
                        </CardTitle>
                        <div className="flex flex-row sm:flex-row items-stretch sm:items-center gap-4">
                            <div className="flex items-center gap-2">
                                <Select
                                    value={empresaFilter}
                                    onValueChange={handleEmpresaFilter}
                                >
                                    <SelectTrigger className="w-[180px]">
                                        <SelectValue placeholder="Filtrar por Empresa" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todas as Empresas</SelectItem>
                                        {uniqueEmpresas.map((empresa) => (
                                            <SelectItem key={empresa} value={empresa}>
                                                {empresa}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                {/* Column customization button - desktop only */}
                                {!isMobile && (
                                    <Dialog>
                                        <DialogTrigger asChild>
                                            <Button variant="outline" size="sm">
                                                <Settings2 className="h-4 w-4 mr-2" />
                                                Colunas
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                            <DialogHeader>
                                                <DialogTitle>Personalizar Colunas</DialogTitle>
                                            </DialogHeader>
                                            <div className="space-y-4">
                                                {table.getAllColumns().map(column => {
                                                    return (
                                                        <div key={column.id} className="flex items-center space-x-2">
                                                            <Checkbox
                                                                checked={column.getIsVisible()}
                                                                onCheckedChange={(value) => column.toggleVisibility(!!value)}
                                                            />
                                                            <label>{getColumnDisplayName(column)}</label>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </DialogContent>
                                    </Dialog>
                                )}
                            </div>
                            <div className="relative">
                                <Input
                                    placeholder="Buscar por pedido, documento, cliente ou representante..."
                                    value={searchTerm}
                                    onChange={(e) => handleSearch(e.target.value)}
                                    className="w-full sm:w-[300px] pr-8"
                                />
                                {searchTerm && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                                        onClick={() => handleSearch('')}
                                    >
                                        <X className="h-4 w-4" />
                                        <span className="sr-only">Clear search</span>
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="relative">
                        {isMobile ? (
                            <>
                                <div className="space-y-4">
                                    {table.getRowModel().rows.map((row) => (
                                        <ExpandableRow 
                                            key={row.id}
                                            row={row.original}
                                            columns={columns.map(col => ({
                                                header: col.header && typeof col.header === 'string' 
                                                    ? col.header 
                                                    : col.accessorKey === 'qtdsku' ? 'Qtd SKUs'
                                                    : col.accessorKey === 'total_faturamento' ? 'Faturamento'
                                                    : col.accessorKey === 'total_custo_produto' ? 'Custo'
                                                    : col.accessorKey === 'margem' ? 'Margem'
                                                    : String(col.accessorKey),
                                                accessor: col.accessorKey as keyof DailySale,
                                                format: col.cell 
                                                    ? (value: any) => {
                                                        const rendered = flexRender(col.cell, { 
                                                            row, 
                                                            cell: row.getAllCells().find(c => c.column.id === col.accessorKey)
                                                        })
                                                        return typeof rendered === 'string' ? rendered : null
                                                    }
                                                    : undefined
                                            }))}
                                            sorting={sorting}
                                            onSort={(field) => {
                                                const isDesc = sorting[0]?.id === field && !sorting[0]?.desc
                                                setSorting([{ id: field, desc: isDesc }])
                                            }}
                                        />
                                    ))}
                                </div>

                                {/* Mobile Pagination Controls */}
                                <div className="mt-4 flex flex-col gap-2">
                                    <div className="flex items-center justify-between">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => table.setPageIndex(table.getState().pagination.pageIndex - 1)}
                                            disabled={!table.getCanPreviousPage()}
                                            className="w-[100px]"
                                        >
                                            <ChevronLeft className="h-4 w-4 mr-1" />
                                            Anterior
                                        </Button>
                                        <span className="text-sm text-muted-foreground">
                                            Página {table.getState().pagination.pageIndex + 1} de{' '}
                                            {table.getPageCount()}
                                        </span>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => table.setPageIndex(table.getState().pagination.pageIndex + 1)}
                                            disabled={!table.getCanNextPage()}
                                            className="w-[100px]"
                                        >
                                            Próximo
                                            <ChevronRight className="h-4 w-4 ml-1" />
                                        </Button>
                                    </div>
                                    
                                    <div className="text-xs text-center text-muted-foreground">
                                        Mostrando {Math.min(
                                            table.getState().pagination.pageSize * table.getState().pagination.pageIndex + 1,
                                            filteredData.length
                                        )} at{" "}
                                        {Math.min(
                                            table.getState().pagination.pageSize * (table.getState().pagination.pageIndex + 1),
                                            filteredData.length
                                        )}{" "}
                                        de {filteredData.length} registros
                                    </div>
                                </div>
                            </>
                        ) : (
                            <Table className="[&_tr]:!py-1 font-roboto">
                                <TableHeader className="sticky top-0 bg-background z-10">
                                    <TableRow className="hover:bg-transparent">
                                        {table.getFlatHeaders().map((header) => (
                                            <TableHead 
                                                key={header.id}
                                                className="!py-2 text-xs md:text-sm"
                                            >
                                                {flexRender(
                                                    header.column.columnDef.header,
                                                    header.getContext()
                                                )}
                                            </TableHead>
                                        ))}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {table.getRowModel().rows?.length ? (
                                        table.getRowModel().rows.map((row) => (
                                            <TableRow 
                                                key={row.id}
                                                className="hover:bg-muted/40"
                                            >
                                                {row.getVisibleCells().map((cell) => (
                                                    <TableCell 
                                                        key={cell.id}
                                                        className="!py-1 text-xs md:text-sm"
                                                    >
                                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                    </TableCell>
                                                ))}
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={columns.length} className="h-24 text-center text-xs md:text-sm">
                                                Nenhum resultado encontrado.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        )}
                    </div>

                    {/* Show pagination info only for desktop view */}
                    {!isMobile && (
                        <div className="flex items-center justify-between px-2 py-4">
                            <div className="flex-1 text-sm text-muted-foreground">
                                Mostrando {Math.min(
                                    table.getState().pagination.pageSize * table.getState().pagination.pageIndex + 1,
                                    filteredData.length
                                )} até{" "}
                                {Math.min(
                                    table.getState().pagination.pageSize * (table.getState().pagination.pageIndex + 1),
                                    filteredData.length
                                )}{" "}
                                de {filteredData.length} registros
                            </div>
                            <div className="flex items-center space-x-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => table.setPageIndex(table.getState().pagination.pageIndex - 1)}
                                    disabled={!table.getCanPreviousPage()}
                                >
                                    Anterior
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => table.setPageIndex(table.getState().pagination.pageIndex + 1)}
                                    disabled={!table.getCanNextPage()}
                                >
                                    Próximo
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            <DataExtracao />

            {showBackToTop && (
                <Button
                    variant="secondary"
                    size="sm"
                    className="fixed bottom-4 right-4 rounded-full shadow-lg z-50"
                    onClick={scrollToTop}
                >
                    <ChevronUp className="h-10 w-10" />
                </Button>
            )}
        </div>
    )
} 