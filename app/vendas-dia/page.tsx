'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { RefreshCw, Download, ArrowUpDown, ArrowUp, ArrowDown, X } from 'lucide-react'
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
import { useRouter, useSearchParams } from 'next/navigation'

export default function DailySales() {
    const router = useRouter()
    const searchParams = useSearchParams()
    
    const [data, setData] = useState<DailySale[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [sorting, setSorting] = useState<SortingState>([])
    const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '')
    const [pagination, setPagination] = useState({
        pageIndex: 0,
        pageSize: 20,
    })
    const [empresaFilter, setEmpresaFilter] = useState(searchParams.get('empresa') || 'all')

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
            cell: ({ row }) => row.original.qtdsku.toLocaleString('pt-BR'),
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
            cell: ({ row }) => `${row.original.margem}%`,
        },
    ], [])

    const fetchData = async (force: boolean = false) => {
        try {
            setError(null)
            if (force) {
                setIsRefreshing(true)
            }

            const response = await fetch('/api/vendas-dia')
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
    }, [])

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
        onSortingChange: setSorting,
        onPaginationChange: setPagination,
        state: {
            sorting,
            pagination,
        },
    })

    const updateSearchParams = (search: string, empresa: string) => {
        const params = new URLSearchParams()
        if (search) params.set('search', search)
        if (empresa !== 'all') params.set('empresa', empresa)
        
        const newUrl = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`
        router.replace(newUrl)
    }

    const handleSearch = (value: string) => {
        setSearchTerm(value)
        updateSearchParams(value, empresaFilter)
    }

    const handleEmpresaFilter = (value: string) => {
        setEmpresaFilter(value)
        updateSearchParams(searchTerm, value)
    }

    if (isLoading) {
        return <Loading />
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                    <h1 className="text-3xl font-bold">Vendas do Dia</h1>
                    <div className="flex items-center gap-4">
                        {lastUpdate && (
                            <span className="text-sm text-muted-foreground">
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

            <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <CardTitle>Lista de Vendas</CardTitle>
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