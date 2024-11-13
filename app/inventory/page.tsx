'use client'

import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { ColumnSelector } from "@/components/column-selector"
import { columnDefinitions, ColumnId, InventoryItem } from "@/types/inventory"
import { format, parseISO } from "date-fns"
import { toZonedTime } from 'date-fns-tz'
import { ptBR } from "date-fns/locale"
import { RefreshCw } from "lucide-react"
import InventoryLoading from './loading'
import { WEBHOOKS } from '@/lib/constants'
import { cn } from '@/lib/utils'
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  ColumnResizeMode,
} from '@tanstack/react-table'
import './styles.css'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
} from "@/components/ui/context-menu"
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { HighlightedText } from "@/components/highlighted-text"
import { compressData, decompressData } from '@/lib/utils';
import { useDebouncedCallback } from 'use-debounce';
import Fuse from 'fuse.js';

const CACHE_KEY = 'inventoryData'
const CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 hours in milliseconds

interface CachedData {
    items: InventoryItem[]
    timestamp: number
}

interface SearchIndex {
    fuse: Fuse<InventoryItem>;
    lastData: InventoryItem[];
}

function getDefaultVisibleColumns(): Set<ColumnId> {
    return new Set(
        Object.entries(columnDefinitions)
            .filter(([_, { show }]) => show)
            .map(([id]) => id as ColumnId)
    )
}

export default function Inventory() {
    const [isLoading, setIsLoading] = useState(true)
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [data, setData] = useState<InventoryItem[]>([])
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
    const [visibleColumns, setVisibleColumns] = useState<Set<ColumnId>>(getDefaultVisibleColumns())
    const [error, setError] = useState<string | null>(null)
    const [pageSize] = useState(40)
    const [pageIndex, setPageIndex] = useState(0)
    const [columnOrder, setColumnOrder] = useState<string[]>([])
    const [columnSizing, setColumnSizing] = useState<Record<string, number>>({})
    const [columnResizeMode] = useState<ColumnResizeMode>('onChange')
    const [sorting, setSorting] = useState<SortingState>([])
    const [searchTerms, setSearchTerms] = useState<string[]>([])
    const [filteredData, setFilteredData] = useState<InventoryItem[]>([])
    const searchIndexRef = useRef<SearchIndex | null>(null);

    // Initialize visible columns and column order from localStorage
    useEffect(() => {
        if (typeof window !== 'undefined') {
            // First load visible columns
            const savedVisibleColumns = localStorage.getItem('inventoryColumns')
            let visibleColumnSet: Set<ColumnId>;
            
            if (savedVisibleColumns) {
                try {
                    const parsed = JSON.parse(savedVisibleColumns) as ColumnId[]
                    visibleColumnSet = new Set(parsed)
                } catch {
                    visibleColumnSet = getDefaultVisibleColumns()
                }
            } else {
                visibleColumnSet = getDefaultVisibleColumns()
            }
            setVisibleColumns(visibleColumnSet)

            // Then load and set column order
            const savedOrder = localStorage.getItem('inventoryColumnOrder')
            if (savedOrder) {
                try {
                    const savedOrderArray = JSON.parse(savedOrder) as string[]
                    
                    // Filter to only include visible columns while maintaining order
                    const validOrderedColumns = savedOrderArray.filter(id => 
                        visibleColumnSet.has(id as ColumnId)
                    )
                    
                    // Add any visible columns that aren't in the saved order at the end
                    const missingColumns = Array.from(visibleColumnSet).filter(id => 
                        !validOrderedColumns.includes(id)
                    )
                    
                    setColumnOrder([...validOrderedColumns, ...missingColumns])
                } catch (e) {
                    console.error('Failed to parse column order:', e)
                    setColumnOrder(Array.from(visibleColumnSet))
                }
            } else {
                setColumnOrder(Array.from(visibleColumnSet))
            }
        }
    }, []) // Only run on mount

    // Update column order when visible columns change
    useEffect(() => {
        if (visibleColumns.size > 0) {
            setColumnOrder(current => {
                // Keep only visible columns in their current order
                const visibleOrdered = current.filter(id => visibleColumns.has(id as ColumnId))
                
                // Add any new visible columns that aren't in the order
                const newColumns = Array.from(visibleColumns).filter(id => !visibleOrdered.includes(id))
                
                const newOrder = [...visibleOrdered, ...newColumns]
                
                // Save to localStorage
                if (typeof window !== 'undefined') {
                    localStorage.setItem('inventoryColumnOrder', JSON.stringify(newOrder))
                }
                
                return newOrder
            })
        }
    }, [visibleColumns])

    // Handle column visibility toggle
    const handleColumnToggle = (columnId: ColumnId) => {
        setVisibleColumns(prev => {
            const next = new Set(prev)
            if (next.has(columnId)) {
                next.delete(columnId)
                // Update column order by removing the hidden column
                setColumnOrder(current => current.filter(id => id !== columnId))
            } else {
                next.add(columnId)
                // Add the new column to the end of the order
                setColumnOrder(current => [...current, columnId])
            }
            
            localStorage.setItem('inventoryColumns', JSON.stringify(Array.from(next)))
            return next
        })
    }

    const saveToLocalStorage = (data: InventoryItem[]): void => {
        try {
            const compressed = compressData(data);
            localStorage.setItem('inventoryData', compressed);
        } catch (error) {
            console.error('Error saving to localStorage:', error);
            // Handle the error appropriately
        }
    };

    const loadFromLocalStorage = (): InventoryItem[] | null => {
        try {
            const compressed = localStorage.getItem('inventoryData');
            if (!compressed) return null;
            return decompressData(compressed);
        } catch (error) {
            console.error('Error loading from localStorage:', error);
            return null;
        }
    };

    const fetchInventoryData = async (force: boolean = false) => {
        setError(null);
        setIsLoading(true);
        
        try {
            if (!force) {
                const cachedData = loadFromLocalStorage();
                if (cachedData) {
                    setData(cachedData);
                    setFilteredData(cachedData);
                    setIsLoading(false);
                    return;
                }
            }

            const response = await fetch('/api/inventory', {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to fetch inventory data');
            }

            const newData = await response.json();
            
            if (!Array.isArray(newData)) {
                throw new Error('Invalid data format received');
            }
            
            // Get the most recent update time from the data
            const mostRecentUpdate = newData.reduce((latest, item) => {
                const itemDate = new Date(item.Atualizacao);
                return latest > itemDate ? latest : itemDate;
            }, new Date(0));
            
            saveToLocalStorage(newData);
            
            setData(newData);
            setFilteredData(newData);
            setLastUpdate(mostRecentUpdate);
        } catch (error) {
            console.error('Failed to fetch inventory data:', error);
            setError(error instanceof Error ? error.message : 'Failed to fetch inventory data');
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    // Initial load
    useEffect(() => {
        fetchInventoryData();
    }, []);

    const handleRefresh = async () => {
        setIsRefreshing(true)
        await fetchInventoryData(true)
    }

    // Initialize search index when data changes
    useEffect(() => {
        if (data.length > 0) {
            const options = {
                keys: Array.from(visibleColumns),
                threshold: 0.0, // Make the match more strict
                ignoreLocation: true,
                useExtendedSearch: true,
                findAllMatches: true,
                includeMatches: true,
                minMatchCharLength: 2,
            };

            searchIndexRef.current = {
                fuse: new Fuse(data, options),
                lastData: data
            };
            
            setFilteredData(data);
        }
    }, [data, visibleColumns]);

    // Update the debounced search function for stricter matching
    const debouncedSearch = useDebouncedCallback((searchValue: string) => {
        if (!searchIndexRef.current) return;

        if (!searchValue.trim()) {
            setFilteredData(data);
            return;
        }

        const searchTerms = searchValue.trim().toLowerCase().split(/\s+/);
        
        // First, do a simple filter to check if items contain all search terms
        const filteredResults = data.filter(item => {
            const itemString = Array.from(visibleColumns)
                .map(columnId => {
                    const value = item[columnId];
                    if (value === null || value === undefined) return '';
                    
                    // Format the value based on column type
                    if (columnId === 'Atualizacao' || columnId === 'DataInicio' || columnId === 'DataFim') {
                        if (!value) return '';
                        return new Date(value).toLocaleString('pt-BR', {
                            timeZone: 'UTC'
                        });
                    }
                    
                    if (columnId.startsWith('VlPreco') || columnId === 'PrecoPromo' || columnId === 'PrecoDe') {
                        return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                    }
                    
                    if (columnId.startsWith('QtEstoque') || columnId === 'StkTotal') {
                        return value.toLocaleString('pt-BR');
                    }
                    
                    return String(value);
                })
                .join(' ')
                .toLowerCase();

            // Check if all search terms are present in the item string
            return searchTerms.every(term => itemString.includes(term));
        });

        setFilteredData(filteredResults);
    }, 150);

    // Update search term and trigger search
    const handleSearch = (value: string) => {
        setSearchTerm(value);
        debouncedSearch(value);
    };

    // Format cell value for display (move outside component for better performance)
    const formatCellValue = useCallback((value: any, columnId: ColumnId): string => {
        if (value === null || value === undefined) return '-';
        
        if (columnId === 'Atualizacao' || columnId === 'DataInicio' || columnId === 'DataFim') {
            if (!value) return '-';
            return new Date(value).toLocaleString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                timeZone: 'UTC'
            });
        }
        
        if (columnId.startsWith('VlPreco') || columnId === 'PrecoPromo' || columnId === 'PrecoDe') {
            return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        }
        
        if (columnId.startsWith('QtEstoque') || columnId === 'StkTotal') {
            return value.toLocaleString('pt-BR');
        }
        
        return String(value);
    }, []);

    // Memoize table configuration
    const tableConfig = useMemo(() => ({
        data: filteredData,
        columns: Array.from(visibleColumns).map(columnId => ({
            id: columnId,
            accessorKey: columnId,
            header: ({ column }: { column: any }) => {
                return (
                    <div className="flex items-center gap-2">
                        <span>{columnDefinitions[columnId].label}</span>
                        <button
                            onClick={() => column.toggleSorting()}
                            className="ml-auto"
                        >
                            {column.getIsSorted() === 'asc' ? (
                                <ArrowUp className="h-4 w-4" />
                            ) : column.getIsSorted() === 'desc' ? (
                                <ArrowDown className="h-4 w-4" />
                            ) : (
                                <ArrowUpDown className="h-4 w-4 opacity-50" />
                            )}
                        </button>
                    </div>
                )
            },
            cell: ({ getValue, row }: { getValue: () => any, row: any }) => {
                const value = getValue()
                const formattedValue = formatCellValue(value, columnId)
                
                if (searchTerm && typeof formattedValue === 'string') {
                    return (
                        <HighlightedText 
                            text={formattedValue}
                            searchTerms={searchTerm.trim().toLowerCase().split(/\s+/)}
                        />
                    )
                }
                
                return formattedValue
            },
            sortingFn: (rowA: any, rowB: any, columnId: string) => {
                const a = rowA.getValue(columnId)
                const b = rowB.getValue(columnId)

                // Handle numeric columns
                if (
                    columnId.startsWith('QtEstoque_') || 
                    columnId === 'StkTotal' ||
                    columnId.startsWith('VlPreco') ||
                    columnId === 'PrecoPromo' ||
                    columnId === 'PrecoDe'
                ) {
                    return (a as number) > (b as number) ? 1 : -1
                }

                // Handle date columns
                if (
                    columnId === 'Atualizacao' ||
                    columnId === 'DataInicio' ||
                    columnId === 'DataFim'
                ) {
                    const dateA = a ? new Date(a as string) : new Date(0)
                    const dateB = b ? new Date(b as string) : new Date(0)
                    return dateA.getTime() - dateB.getTime()
                }

                return (a as string).localeCompare(b as string, 'pt-BR')
            },
            size: columnSizing[columnId] || (() => {
                switch (columnId) {
                    case 'CdChamada':
                        return 90
                    case 'NmProduto':
                        return 400
                    case 'NmGrupoProduto':
                    case 'NmFamiliaProduto':
                        return 200
                    case 'Atualizacao':
                    case 'DataInicio':
                    case 'DataFim':
                        return 180
                    case 'VlPreco_Empresa59':
                    case 'PrecoPromo':
                    case 'PrecoDe':
                        return 120
                    default:
                        return 150
                }
            })(),
            minSize: 80,
            maxSize: 600,
        })),
        state: {
            pagination: {
                pageIndex,
                pageSize,
            },
            columnOrder,
            columnSizing,
            sorting,
        },
        onSortingChange: setSorting,
        getSortedRowModel: getSortedRowModel(),
        onColumnOrderChange: setColumnOrder,
        onColumnSizingChange: setColumnSizing,
        columnResizeMode,
        enableColumnResizing: true,
        enableSorting: true,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        onPaginationChange: (updater: any) => {
            if (typeof updater === 'function') {
                const newState = updater({ pageIndex, pageSize })
                setPageIndex(newState.pageIndex)
            }
        },
        pageCount: Math.ceil(filteredData.length / pageSize),
        defaultColumn: {
            size: 150,
            minSize: 80,
            maxSize: 600,
        },
    }), [filteredData, visibleColumns, searchTerm, formatCellValue, columnOrder, columnSizing, sorting, pageIndex, pageSize]);

    const table = useReactTable(tableConfig);

    // Add this function to handle column reordering
    const handleColumnReorder = (draggedColumnId: string, targetColumnId: string) => {
        const allColumnIds = Object.keys(columnDefinitions)
        
        if (!allColumnIds.includes(draggedColumnId) || !allColumnIds.includes(targetColumnId)) {
            return
        }

        setColumnOrder(currentOrder => {
            const newOrder = [...currentOrder]
            const currentIndex = newOrder.indexOf(draggedColumnId)
            const targetIndex = newOrder.indexOf(targetColumnId)
            
            if (currentIndex !== -1 && targetIndex !== -1) {
                newOrder.splice(currentIndex, 1)
                newOrder.splice(targetIndex, 0, draggedColumnId)
                
                // Save the new order immediately
                localStorage.setItem('inventoryColumnOrder', JSON.stringify(newOrder))
            }
            
            return newOrder
        })
    }

    // Add this function to handle column hiding
    const handleHideColumn = (columnId: string) => {
        if (visibleColumns.size <= 1) return; // Prevent hiding all columns
        setVisibleColumns(prev => {
            const next = new Set(prev);
            next.delete(columnId as ColumnId);
            return next;
        });
        setColumnOrder(current => current.filter(id => id !== columnId));
    };

    if (isLoading) {
        return <InventoryLoading />
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                    <h1 className="text-3xl font-bold">Inventário</h1>
                    <div className="flex items-center gap-4">
                        {lastUpdate && (
                            <div className="flex flex-col items-end">
                                <span className="text-xs text-muted-foreground">
                                    Última atualização do banco de dados
                                </span>
                                <span className="text-sm font-medium">
                                    {new Date(lastUpdate).toLocaleString('pt-BR', {
                                        day: '2-digit',
                                        month: '2-digit',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        timeZone: 'UTC'
                                    })}
                                </span>
                            </div>
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
                        <ColumnSelector 
                            visibleColumns={visibleColumns}
                            onColumnChange={handleColumnToggle}
                        />
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
                    <div className="flex justify-between items-center">
                        <CardTitle>Lista de Produtos</CardTitle>
                        <div className="flex-1 max-w-sm ml-4">
                            <Input
                                placeholder="Buscar em todos os campos..."
                                value={searchTerm}
                                onChange={(e) => handleSearch(e.target.value)}
                                className="w-full"
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="relative overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    {table.getFlatHeaders().map((header) => (
                                        <TableHead 
                                            key={header.id}
                                            className={cn(
                                                "whitespace-nowrap px-2 first:pl-4 last:pr-4 relative select-none group",
                                                header.column.getCanResize() && "resize-handle"
                                            )}
                                            style={{
                                                width: header.getSize(),
                                                position: 'relative'
                                            }}
                                        >
                                            <ContextMenu>
                                                <ContextMenuTrigger>
                                                    <div
                                                        draggable
                                                        onDragStart={(e) => {
                                                            e.dataTransfer.setData('text/plain', header.column.id)
                                                            e.currentTarget.classList.add('dragging')
                                                        }}
                                                        onDragEnd={(e) => {
                                                            e.currentTarget.classList.remove('dragging')
                                                        }}
                                                        onDragOver={(e) => {
                                                            e.preventDefault()
                                                            e.currentTarget.classList.add('drop-target')
                                                        }}
                                                        onDragLeave={(e) => {
                                                            e.currentTarget.classList.remove('drop-target')
                                                        }}
                                                        onDrop={(e) => {
                                                            e.preventDefault()
                                                            e.currentTarget.classList.remove('drop-target')
                                                            const draggedColumnId = e.dataTransfer.getData('text/plain')
                                                            handleColumnReorder(draggedColumnId, header.column.id)
                                                        }}
                                                        className="cursor-move py-2 flex items-center gap-2"
                                                    >
                                                        {flexRender(
                                                            header.column.columnDef.header,
                                                            header.getContext()
                                                        )}
                                                    </div>
                                                </ContextMenuTrigger>
                                                <ContextMenuContent>
                                                    <ContextMenuItem
                                                        onClick={() => header.column.toggleSorting(false)}
                                                    >
                                                        <ArrowUp className="mr-2 h-4 w-4" />
                                                        Ordenar Crescente
                                                    </ContextMenuItem>
                                                    <ContextMenuItem
                                                        onClick={() => header.column.toggleSorting(true)}
                                                    >
                                                        <ArrowDown className="mr-2 h-4 w-4" />
                                                        Ordenar Decrescente
                                                    </ContextMenuItem>
                                                    <ContextMenuItem
                                                        onClick={() => header.column.clearSorting()}
                                                    >
                                                        <ArrowUpDown className="mr-2 h-4 w-4" />
                                                        Remover Ordenação
                                                    </ContextMenuItem>
                                                    <ContextMenuSeparator />
                                                    <ContextMenuItem
                                                        onClick={() => handleHideColumn(header.column.id)}
                                                        disabled={visibleColumns.size <= 1}
                                                    >
                                                        Ocultar coluna
                                                    </ContextMenuItem>
                                                </ContextMenuContent>
                                            </ContextMenu>
                                            {header.column.getCanResize() && (
                                                <div
                                                    onMouseDown={header.getResizeHandler()}
                                                    onTouchStart={header.getResizeHandler()}
                                                    className={cn(
                                                        "absolute right-0 top-0 h-full w-1 cursor-col-resize select-none touch-none",
                                                        "opacity-0 group-hover:opacity-100 bg-gray-200 hover:bg-gray-400"
                                                    )}
                                                />
                                            )}
                                        </TableHead>
                                    ))}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {table.getRowModel().rows.map((row) => (
                                    <TableRow key={row.id}>
                                        {row.getVisibleCells().map((cell) => (
                                            <TableCell 
                                                key={cell.id}
                                                className="px-2 first:pl-4 last:pr-4"
                                                style={{
                                                    width: cell.column.getSize(),
                                                    maxWidth: cell.column.getSize(),
                                                    whiteSpace: 'normal', // Allow text to wrap
                                                    wordBreak: 'break-word' // Break long words if needed
                                                }}
                                            >
                                                {flexRender(
                                                    cell.column.columnDef.cell,
                                                    cell.getContext()
                                                )}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Pagination Controls */}
                    <div className="flex items-center justify-between px-4 py-3 border-t">
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPageIndex(0)}
                                disabled={!table.getCanPreviousPage()}
                            >
                                {'<<'}
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPageIndex(prev => prev - 1)}
                                disabled={!table.getCanPreviousPage()}
                            >
                                {'<'}
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPageIndex(prev => prev + 1)}
                                disabled={!table.getCanNextPage()}
                            >
                                {'>'}
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPageIndex(table.getPageCount() - 1)}
                                disabled={!table.getCanNextPage()}
                            >
                                {'>>'}
                            </Button>
                        </div>
                        <div className="flex-1 text-sm text-muted-foreground text-center">
                            Página{' '}
                            <strong>
                                {pageIndex + 1} de{' '}
                                {table.getPageCount()}
                            </strong>
                        </div>
                        <div className="text-sm text-muted-foreground">
                            Total: {filteredData.length} items
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}