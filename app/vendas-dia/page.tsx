'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { RefreshCw, Download, ArrowUpDown, ArrowUp, ArrowDown, X, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react'
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
import { ChevronLeft, ChevronRight } from 'lucide-react'

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
    const [date, setDate] = useState<Date>(() => {
        const dateParam = searchParams.get('date')
        return dateParam ? new Date(dateParam) : new Date()
    })

    const columns = useMemo<ColumnDef<DailySale>[]>(() => [
        {
            accessorKey: 'cdpedido',
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                    Pedido
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
                    href={`/vendas-dia/${row.original.cdpedido}?nrdocumento=${row.original.nrdocumento}`}
                    className="text-blue-500 hover:text-blue-700 underline"
                >
                    {row.original.cdpedido}
                </Link>
            ),
        },
        {
            accessorKey: 'nrdocumento',
            header: "Documento",
        },
        {
            accessorKey: 'nmpessoa',
            header: "Cliente",
        },
        {
            accessorKey: 'nmrepresentantevenda',
            header: "Representante",
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
                    Faturamento
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

            const formattedDate = format(date, 'dd/MM/yyyy')
            const response = await fetch(`/api/vendas-dia?date=${formattedDate}`)
            if (!response.ok) {
                throw new Error('Failed to fetch sales data')
            }

            const salesData = await response.json()
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
    }, [date])

    const handleRefresh = () => {
        fetchData(true)
    }

    const handleExportXLSX = () => {
        const worksheet = XLSX.utils.json_to_sheet(data)
        const workbook = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(workbook, worksheet, "Vendas do Dia")
        XLSX.writeFile(workbook, `vendas-dia-${new Date().toISOString().split('T')[0]}.xlsx`)
    }

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
            updateSearchParams(date, searchTerm, empresaFilter, newSorting)
        },
        onPaginationChange: setPagination,
        state: {
            sorting,
            pagination,
        },
    })

    const updateSearchParams = (newDate?: Date, search?: string, empresa?: string, newSorting?: SortingState | ((prev: SortingState) => SortingState)) => {
        const params = new URLSearchParams(searchParams.toString())
        
        if (newDate) {
            params.set('date', newDate.toISOString().split('T')[0])
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
        
        router.replace(`${window.location.pathname}?${params.toString()}`)
    }

    const handleDateChange = (newDate: Date | undefined) => {
        if (newDate) {
            setDate(newDate)
            updateSearchParams(newDate, searchTerm, empresaFilter, sorting)
        }
    }

    const handlePreviousDay = () => {
        const newDate = subDays(date, 1)
        setDate(newDate)
        updateSearchParams(newDate, searchTerm, empresaFilter, sorting)
    }

    const handleNextDay = () => {
        const newDate = addDays(date, 1)
        setDate(newDate)
        updateSearchParams(newDate, searchTerm, empresaFilter, sorting)
    }

    const handleSearch = (value: string) => {
        setSearchTerm(value)
        updateSearchParams(date, value, empresaFilter, sorting)
    }

    const handleEmpresaFilter = (value: string) => {
        setEmpresaFilter(value)
        updateSearchParams(date, searchTerm, value, sorting)
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

    useEffect(() => {
        const dateParam = searchParams.get('date')
        if (dateParam) {
            setDate(new Date(dateParam))
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
    }, [])

    if (isLoading) {
        return <Loading />
    }

    return (
        <div className="space-y-6 min-w-[300px]">
            <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                    <h1 className="text-3xl font-bold ml-10">Vendas do Dia</h1>
                    <div className="flex items-center gap-4 mt-2">
                        {lastUpdate && (
                            <span className="text-xs text-muted-foreground">
                                Última atualização: {lastUpdate.toLocaleString('pt-BR')}
                            </span>
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

            <div className="flex items-center gap-4 ml-10">
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
                                    !date && "text-muted-foreground"
                                )}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {date ? (
                                    <span className="font-medium">
                                        {format(date, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                                    </span>
                                ) : (
                                    <span>Selecione uma data</span>
                                )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                mode="single"
                                selected={date}
                                onSelect={handleDateChange}
                                initialFocus
                                locale={ptBR}
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

            <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5 w-full">
                {companySummaries.map((summary) => {
                    const margin = (summary.faturamento - (summary.faturamento * 0.268 + summary.custo)) / summary.faturamento * 100;
                    const marginStyle = getMarginStyle(margin);
                    const isSelected = empresaFilter === summary.empresa;

                    return (
                        <Card 
                            key={summary.empresa} 
                            className={cn(
                                "relative overflow-hidden cursor-pointer transition-all duration-200",
                                isSelected 
                                    ? "ring-2 ring-primary hover:ring-primary/70" 
                                    : "hover:ring-2 hover:ring-primary/50 opacity-70 hover:opacity-100",
                                empresaFilter !== 'all' && !isSelected && "opacity-50"
                            )}
                            onClick={() => handleEmpresaFilter(isSelected ? 'all' : summary.empresa)}
                        >
                            <div className={cn(
                                "absolute top-0 right-0 w-24 h-24 -translate-y-8 translate-x-8",
                                isSelected ? "opacity-30" : "opacity-20"
                            )}>
                                {marginStyle.icon}
                            </div>
                            <CardHeader className="p-4">
                                <CardTitle className="text-sm flex items-center justify-between">
                                    {summary.empresa}
                                    {isSelected && (
                                        <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded-full">
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

            <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <CardTitle>
                            Lista de Vendas - {format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                        </CardTitle>
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
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
                    <div className="relative overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    {table.getFlatHeaders().map((header) => (
                                        <TableHead key={header.id}>
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
                                        <TableRow key={row.id}>
                                            {row.getVisibleCells().map((cell) => (
                                                <TableCell key={cell.id}>
                                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={columns.length} className="h-24 text-center">
                                            Nenhum resultado encontrado.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    <div className="flex items-center justify-between px-2 py-4">
                        <div className="flex-1 text-sm text-muted-foreground">
                            Mostrando {table.getState().pagination.pageSize * table.getState().pagination.pageIndex + 1} até{" "}
                            {Math.min(
                                table.getState().pagination.pageSize * (table.getState().pagination.pageIndex + 1),
                                table.getFilteredRowModel().rows.length
                            )}{" "}
                            de {table.getFilteredRowModel().rows.length} registros
                        </div>
                        <div className="flex items-center space-x-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => table.previousPage()}
                                disabled={!table.getCanPreviousPage()}
                            >
                                Anterior
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => table.nextPage()}
                                disabled={!table.getCanNextPage()}
                            >
                                Próximo
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
} 