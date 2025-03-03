'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { RefreshCw, Download, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ESLItem } from '@/types/esl-maracanau'
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
import { HighlightedText } from "@/components/highlighted-text"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"

const CACHE_KEY = 'eslData_maracanau'
const CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 hours

type CachedData = {
    items: ESLItem[]
    timestamp: number
}

export default function ESLItems() {
    const [data, setData] = useState<ESLItem[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [sorting, setSorting] = useState<SortingState>([])
    const [searchTerm, setSearchTerm] = useState('')
    const [searchTerms, setSearchTerms] = useState<string[]>([])
    const [pagination, setPagination] = useState({
        pageIndex: 0,
        pageSize: 20,
    })
    const [layoutFilter, setLayoutFilter] = useState<string>('all')
    const [showPriceDifference, setShowPriceDifference] = useState(false)

    const columns = useMemo<ColumnDef<ESLItem>[]>(() => [
        {
            accessorKey: 'sku',
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                    SKU
                    {column.getIsSorted() === "asc" ? (
                        <ArrowUp className="ml-2 h-4 w-4" />
                    ) : column.getIsSorted() === "desc" ? (
                        <ArrowDown className="ml-2 h-4 w-4" />
                    ) : (
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    )}
                </Button>
            ),
        },
        {
            accessorKey: 'produto',
            header: "Produto",
            cell: ({ getValue }) => {
                const value = getValue() as string
                return searchTerms.length ? (
                    <HighlightedText text={value} searchTerms={searchTerms} />
                ) : value
            }
        },
        {
            accessorKey: 'grupo',
            header: "Grupo",
        },
        {
            accessorKey: 'familia',
            header: "Família",
        },
        {
            accessorKey: 'layout',
            header: "Layout",
        },
        {
            accessorKey: 'unidade',
            header: "Unidade",
        },
        {
            accessorKey: 'stock1',
            header: "Stock",
            cell: ({ getValue }) => {
                const value = getValue() as number
                return value.toLocaleString('pt-BR')
            },
        },
        {
            accessorKey: 'QtEstoque_Empresa13',
            header: "Qt. Estoque",
            cell: ({ getValue }) => {
                const value = getValue() as number
                return value.toLocaleString('pt-BR')
            },
        },
        {
            accessorKey: 'price',
            header: "Preço",
            cell: ({ row }) => {
                const price = row.getValue('price') as number
                const vlPreco = row.getValue('VlPreco_Empresa13') as number
                const isDifferent = price !== vlPreco

                return (
                    <span className={isDifferent ? 'text-red-500 font-medium' : ''}>
                        {price.toLocaleString('pt-BR', {
                            style: 'currency',
                            currency: 'BRL'
                        })}
                    </span>
                )
            },
        },
        {
            accessorKey: 'VlPreco_Empresa13',
            header: "Preço Empresa",
            cell: ({ row }) => {
                const price = row.getValue('price') as number
                const vlPreco = row.getValue('VlPreco_Empresa13') as number
                const isDifferent = price !== vlPreco

                return (
                    <span className={isDifferent ? 'text-red-500 font-medium' : ''}>
                        {vlPreco.toLocaleString('pt-BR', {
                            style: 'currency',
                            currency: 'BRL'
                        })}
                    </span>
                )
            },
        },
    ], [searchTerms])

    const loadFromCache = () => {
        if (typeof window !== 'undefined') {
            const cached = localStorage.getItem(CACHE_KEY)
            if (cached) {
                try {
                    const parsedCache: CachedData = JSON.parse(cached)
                    const now = Date.now()
                    if (now - parsedCache.timestamp < CACHE_DURATION) {
                        setData(parsedCache.items)
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

            const response = await fetch('/api/esl-stk-maracanau')
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}))
                throw new Error(errorData.error || 'Failed to fetch data')
            }

            const items: ESLItem[] = await response.json()
            
            if (typeof window !== 'undefined') {
                localStorage.setItem(CACHE_KEY, JSON.stringify({
                    items,
                    timestamp: Date.now()
                }))
            }

            setData(items)
            setLastUpdate(new Date())
        } catch (error) {
            console.error('Error fetching data:', error)
            setError(error instanceof Error ? error.message : 'Falha ao carregar dados')
        } finally {
            setIsLoading(false)
            setIsRefreshing(false)
        }
    }

    const handleRefresh = async () => {
        setIsRefreshing(true)
        await fetchData(true)
    }

    const handleExportXLSX = () => {
        const worksheet = XLSX.utils.json_to_sheet(data)
        const workbook = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(workbook, worksheet, "Etiquetas em Uso")
        XLSX.writeFile(workbook, `Maracanau-etiquetas-em-uso-${format(new Date(), 'dd-MM-yyyy')}.xlsx`)
    }

    useEffect(() => {
        fetchData()
    }, [])

    const handleSearch = useCallback((value: string) => {
        setSearchTerm(value)
        const terms = value.trim().toLowerCase().split(/\s+/).filter(Boolean)
        setSearchTerms(terms)
    }, [])

    const filteredData = useMemo(() => {
        let filtered = data

        // Filter by search terms
        if (searchTerms.length) {
            filtered = filtered.filter(item => {
                const searchText = `${item.sku} ${item.produto}`.toLowerCase()
                return searchTerms.every(term => searchText.includes(term.toLowerCase()))
            })
        }

        // Filter by layout
        if (layoutFilter !== 'all') {
            filtered = filtered.filter(item => item.layout === layoutFilter)
        }

        // Filter by price difference
        if (showPriceDifference) {
            filtered = filtered.filter(item => item.price !== item.VlPreco_Empresa13)
        }

        return filtered
    }, [data, searchTerms, layoutFilter, showPriceDifference])

    const uniqueLayouts = useMemo(() => {
        const layouts = [...new Set(data.map(item => item.layout))]
        return layouts.sort()
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

    if (isLoading) {
        return <Loading />
    }

    return (
        <div className="container px-2 sm:px-4 mx-auto py-4 space-y-4">
            <Card>
                <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-3 sm:px-6">
                    <CardTitle>Etiquetas em uso - Maracanau</CardTitle>
                    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                        <Input
                            placeholder="Filtrar..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full sm:w-auto"
                        />
                        <div className="flex flex-wrap gap-2">
                            <Button
                                variant="outline"
                                onClick={handleRefresh}
                                disabled={isRefreshing}
                                className="flex items-center gap-2"
                            >
                                <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
                                <span className="hidden sm:inline">Atualizar</span>
                            </Button>
                            <Button
                                variant="outline"
                                onClick={handleExportXLSX}
                                disabled={isRefreshing || filteredData.length === 0}
                                className="flex items-center gap-2"
                            >
                                <Download className="h-4 w-4" />
                                <span className="hidden sm:inline">Exportar</span>
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="px-3 sm:px-6">
                    <div className="flex flex-col sm:flex-row gap-2 mb-4">
                        <Select value={layoutFilter} onValueChange={setLayoutFilter}>
                            <SelectTrigger className="w-full sm:w-[180px]">
                                <SelectValue placeholder="Filtrar por layout" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos os layouts</SelectItem>
                                {uniqueLayouts.map(layout => (
                                    <SelectItem key={layout} value={layout}>{layout}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="showPriceDifference"
                                checked={showPriceDifference}
                                onCheckedChange={(checked: boolean) => setShowPriceDifference(checked)}
                            />
                            <label
                                htmlFor="showPriceDifference"
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                                Mostrar apenas diferenças de preço
                            </label>
                        </div>
                    </div>
                    {isLoading ? (
                        <Loading />
                    ) : (
                        <>
                            <div className="rounded-md border overflow-x-auto">
                                <Table className="text-xs sm:text-sm">
                                    <TableHeader>
                                        {table.getHeaderGroups().map((headerGroup) => (
                                            <TableRow key={headerGroup.id}>
                                                {headerGroup.headers.map((header) => (
                                                    <TableHead key={header.id} className="text-xs sm:text-sm">
                                                        {header.isPlaceholder ? null : (
                                                            <div
                                                                className={cn(
                                                                    "flex items-center gap-1",
                                                                    header.column.getCanSort() && "cursor-pointer select-none"
                                                                )}
                                                                onClick={header.column.getToggleSortingHandler()}
                                                            >
                                                                {flexRender(
                                                                    header.column.columnDef.header,
                                                                    header.getContext()
                                                                )}
                                                                {header.column.columnDef.header && 
                                                                 !String(header.column.columnDef.header).includes("ArrowUp") && (
                                                                    <>
                                                                        {{
                                                                            asc: <ArrowUp className="h-3 w-3 sm:h-4 sm:w-4" />,
                                                                            desc: <ArrowDown className="h-3 w-3 sm:h-4 sm:w-4" />,
                                                                        }[header.column.getIsSorted() as string] ?? (
                                                                            header.column.getCanSort() && <ArrowUpDown className="h-3 w-3 sm:h-4 sm:w-4 opacity-50" />
                                                                        )}
                                                                    </>
                                                                )}
                                                            </div>
                                                        )}
                                                    </TableHead>
                                                ))}
                                            </TableRow>
                                        ))}
                                    </TableHeader>
                                    <TableBody>
                                        {table.getRowModel().rows?.length ? (
                                            table.getRowModel().rows.map((row) => (
                                                <TableRow
                                                    key={row.id}
                                                    data-state={row.getIsSelected() && "selected"}
                                                >
                                                    {row.getVisibleCells().map((cell) => (
                                                        <TableCell key={cell.id} className="text-xs sm:text-sm py-2 sm:py-4">
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
                            <div className="flex flex-col sm:flex-row items-center justify-between space-y-2 sm:space-y-0 py-4">
                                <div className="text-xs sm:text-sm text-muted-foreground">
                                    Mostrando {table.getRowModel().rows.length} de {filteredData.length} registros
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => table.previousPage()}
                                        disabled={!table.getCanPreviousPage()}
                                        className="text-xs sm:text-sm"
                                    >
                                        Anterior
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => table.nextPage()}
                                        disabled={!table.getCanNextPage()}
                                        className="text-xs sm:text-sm"
                                    >
                                        Próximo
                                    </Button>
                                </div>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    )
} 