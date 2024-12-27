'use client'
import { PermissionGuard } from '@/components/guards/permission-guard'
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
import { Roboto } from 'next/font/google'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Check, ChevronsUpDown } from "lucide-react"
import Image from 'next/image'
import { ImagePreviewModal } from "@/components/image-preview-modal"
import { ManageProductImagesModal } from "@/components/manage-product-images-modal"
import { LayoutGrid, Table as TableIcon } from "lucide-react"
import { Toggle } from "@/components/ui/toggle"

const roboto = Roboto({
    weight: ['400', '500'],
    subsets: ['latin'],
    display: 'swap',
})

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

interface ProductImage {
    imagem_url: string | null;
}

type ViewMode = 'table' | 'grid';

function getDefaultVisibleColumns(): Set<ColumnId> {
    return new Set(
        Object.entries(columnDefinitions)
            .filter(([_, { show }]) => show)
            .map(([id]) => id as ColumnId)
    )
}

// First, add this CSS to ensure the table respects column widths
// Add this near the top of the file after the imports
const TABLE_STYLES = {
    tableLayout: 'fixed' as const,
    width: '100%'
} as const;

// Add this function at the top level of the component
const loadSavedColumnOrder = (): string[] => {
    if (typeof window === 'undefined') return [];
    
    try {
        const savedOrder = localStorage.getItem('inventoryColumnOrder');
        if (!savedOrder) return [];
        return JSON.parse(savedOrder);
    } catch (e) {
        console.error('Failed to load column order:', e);
        return [];
    }
};

// Add this constant at the top of the file with other constants
const ALL_GROUPS = '__all__';

function getProductImage(cdChamada: string): Promise<string | null> {
    return fetch(`/api/produto/image?cdChamada=${encodeURIComponent(cdChamada)}`)
        .then(response => {
            if (!response.ok) return null;
            return response.json().then(data => data.imageUrl || null);
        })
        .catch(error => {
            console.error('Error fetching product image:', error);
            return null;
        });
}

export default function Inventory() {
    const router = useRouter()
    const searchParams = useSearchParams()
    
    const [isLoading, setIsLoading] = useState(true)
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '')
    const [data, setData] = useState<InventoryItem[]>([])
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
    const [visibleColumns, setVisibleColumns] = useState<Set<ColumnId>>(getDefaultVisibleColumns())
    const [error, setError] = useState<string | null>(null)
    const [pageSize] = useState(40)
    const [pageIndex, setPageIndex] = useState(0)
    const [columnOrder, setColumnOrder] = useState<string[]>(loadSavedColumnOrder())
    const [columnSizing, setColumnSizing] = useState<Record<string, number>>({})
    const [columnResizeMode] = useState<ColumnResizeMode>('onChange')
    const [sorting, setSorting] = useState<SortingState>([])
    const [searchTerms, setSearchTerms] = useState<string[]>([])
    const [filteredData, setFilteredData] = useState<InventoryItem[]>([])
    const searchIndexRef = useRef<SearchIndex | null>(null);
    const [selectedGroups, setSelectedGroups] = useState<string[]>(() => {
        const groups = searchParams.get('groups');
        if (!groups) return [ALL_GROUPS];
        try {
            const parsed = JSON.parse(decodeURIComponent(groups));
            return Array.isArray(parsed) && parsed.length > 0 ? parsed : [ALL_GROUPS];
        } catch {
            return [ALL_GROUPS];
        }
    });
    const [isMobile, setIsMobile] = useState(false);
    const [imageCache, setImageCache] = useState<Record<string, string | null>>({});
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [selectedProduct, setSelectedProduct] = useState<{ code: string; name: string } | null>(null);
    const [showOnlyInStock, setShowOnlyInStock] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('showOnlyInStock');
            return saved ? JSON.parse(saved) : false;
        }
        return false;
    });
    const [viewMode, setViewMode] = useState<ViewMode>(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('inventoryViewMode') as ViewMode || 'table'
        }
        return 'table'
    });

    // Initialize visible columns and column order from localStorage
    useEffect(() => {
        if (typeof window !== 'undefined') {
            // Load visible columns first
            const savedVisibleColumns = localStorage.getItem('inventoryColumns');
            let visibleColumnSet: Set<ColumnId>;
            
            if (savedVisibleColumns) {
                try {
                    const parsed = JSON.parse(savedVisibleColumns) as ColumnId[];
                    visibleColumnSet = new Set(parsed);
                } catch {
                    visibleColumnSet = getDefaultVisibleColumns();
                }
            } else {
                visibleColumnSet = getDefaultVisibleColumns();
            }
            
            // Load saved column order
            const savedOrder = loadSavedColumnOrder();
            
            if (savedOrder.length > 0) {
                // Use the saved order exactly as is, only filtering out non-visible columns
                const validOrder = savedOrder.filter(id => visibleColumnSet.has(id as ColumnId));
                
                // Only add missing columns that are visible but not in the saved order
                const missingColumns = Array.from(visibleColumnSet).filter(id => !validOrder.includes(id));
                
                setColumnOrder([...validOrder, ...missingColumns]);
            } else {
                // If no saved order exists, create initial order from visible columns
                const defaultOrder = Array.from(visibleColumnSet);
                setColumnOrder(defaultOrder);
                // Save this initial order
                localStorage.setItem('inventoryColumnOrder', JSON.stringify(defaultOrder));
            }
            
            setVisibleColumns(visibleColumnSet);
        }
    }, []); // Only run on mount

    // Handle column visibility toggle
    const handleColumnToggle = (columnId: ColumnId) => {
        setVisibleColumns(prev => {
            const next = new Set(prev);
            
            if (next.has(columnId)) {
                next.delete(columnId);
                // Update column order by removing the hidden column
                setColumnOrder(current => {
                    const newOrder = current.filter(id => id !== columnId);
                    localStorage.setItem('inventoryColumnOrder', JSON.stringify(newOrder));
                    return newOrder;
                });
            } else {
                next.add(columnId);
                // Add the new column to the end of the order
                setColumnOrder(current => {
                    const newOrder = [...current, columnId];
                    localStorage.setItem('inventoryColumnOrder', JSON.stringify(newOrder));
                    return newOrder;
                });
            }
            
            localStorage.setItem('inventoryColumns', JSON.stringify(Array.from(next)));
            return next;
        });
    };

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
            const data = decompressData(compressed);
            
            // Find the most recent update time from the cached data
            const mostRecentUpdate = data.reduce((latest: Date, item: InventoryItem) => {
                const itemDate = new Date(item.Atualizacao);
                return latest > itemDate ? latest : itemDate;
            }, new Date(0));
            
            // Set the last update time
            setLastUpdate(mostRecentUpdate);
            
            return data;
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

    // Modifique a função getUniqueGroups
    const getUniqueGroups = useCallback((items: InventoryItem[]): string[] => {
        // Primeiro filtra os itens com estoque
        const itemsWithStock = items.filter(item => item.StkTotal > 0);
        
        // Depois pega os grupos únicos dos itens com estoque
        const groups = new Set(itemsWithStock.map(item => item.NmGrupoProduto));
        
        return Array.from(groups).sort();
    }, []);

    // Modifique também a lógica de seleção de grupos para lidar com grupos que podem não existir mais
    useEffect(() => {
        if (data.length > 0 && !selectedGroups.includes(ALL_GROUPS)) {
            const availableGroups = getUniqueGroups(data);
            
            // Filtra os grupos selecionados para manter apenas os que ainda existem
            const validGroups = selectedGroups.filter(group => availableGroups.includes(group));
            
            // Se não sobrar nenhum grupo válido, volta para "Todos os grupos"
            if (validGroups.length === 0) {
                setSelectedGroups([ALL_GROUPS]);
                
                // Atualiza a URL
                const params = new URLSearchParams(searchParams);
                params.delete('groups');
                if (searchTerm) {
                    params.set('q', searchTerm);
                }
                router.replace(`/inventory?${params.toString()}`);
            } else if (validGroups.length !== selectedGroups.length) {
                // Se alguns grupos foram removidos, atualiza a seleção
                setSelectedGroups(validGroups);
                
                // Atualiza a URL
                const params = new URLSearchParams(searchParams);
                params.set('groups', encodeURIComponent(JSON.stringify(validGroups)));
                if (searchTerm) {
                    params.set('q', searchTerm);
                }
                router.replace(`/inventory?${params.toString()}`);
            }
        }
    }, [data, selectedGroups, getUniqueGroups, searchParams, searchTerm, router]);

    // Modify the useEffect that handles search/filtering to include group filtering
    useEffect(() => {
        if (data.length > 0) {
            const options = {
                keys: Array.from(visibleColumns),
                threshold: 0.0,
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
            
            // Aplique todos os filtros em sequência
            let filtered = data;
            
            // 1. Filtro de grupo
            if (!selectedGroups.includes(ALL_GROUPS)) {
                filtered = filtered.filter(item => selectedGroups.includes(item.NmGrupoProduto));
            }
            
            // 2. Filtro de estoque
            if (showOnlyInStock) {
                filtered = filtered.filter(item => item.StkTotal > 0);
            }
            
            // 3. Filtro de busca
            if (searchTerm) {
                const searchTerms = searchTerm.trim().toLowerCase().split(/\s+/);
                filtered = filtered.filter(item => {
                    const itemString = Array.from(visibleColumns)
                        .map(columnId => {
                            const value = item[columnId];
                            if (value === null || value === undefined) return '';
                            return String(value);
                        })
                        .join(' ')
                        .toLowerCase();

                    return searchTerms.every(term => itemString.includes(term));
                });
            }
            
            setFilteredData(filtered);
        }
    }, [data, visibleColumns, searchTerm, selectedGroups, showOnlyInStock]); // Adicione showOnlyInStock às dependências

    // Update the debouncedSearch to be memoized with useCallback
    const debouncedSearch = useCallback(
        useDebouncedCallback((searchValue: string) => {
            if (!searchIndexRef.current) return;

            if (!searchValue.trim()) {
                setFilteredData(data);
                return;
            }

            const searchTerms = searchValue.trim().toLowerCase().split(/\s+/);
            
            const filteredResults = data.filter(item => {
                const itemString = Array.from(visibleColumns)
                    .map(columnId => {
                        const value = item[columnId];
                        if (value === null || value === undefined) return '';
                        
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

                return searchTerms.every(term => itemString.includes(term));
            });

            setFilteredData(filteredResults);
        }, 150),
        [data, visibleColumns]
    ); // Add dependencies for useCallback

    // Update search term and trigger search
    const handleSearch = (value: string) => {
        setSearchTerm(value);
        
        const params = new URLSearchParams(searchParams);
        if (value) {
            params.set('q', value);
        } else {
            params.delete('q');
        }
        
        // Mantém os grupos selecionados na URL
        if (selectedGroups.length === 1 && selectedGroups[0] === ALL_GROUPS) {
            params.delete('groups');
        } else {
            params.set('groups', encodeURIComponent(JSON.stringify(selectedGroups)));
        }
        
        router.replace(`/inventory?${params.toString()}`);
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
        
        // Handle NmFornecedorPrincipal specifically if needed
        if (columnId === 'NmFornecedorPrincipal') {
            return String(value || '-');
        }
        
        return String(value);
    }, []);

    // Adicione este useEffect para detectar a largura da tela
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 640);
        };
        
        // Checa inicialmente
        checkMobile();
        
        // Adiciona listener para mudanças de tamanho
        window.addEventListener('resize', checkMobile);
        
        // Cleanup
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Modifique a função que define os tamanhos das colunas no tableConfig
    const getColumnSize = (columnId: string): number => {
        if (columnId === 'imagem') return 60;
        if (columnSizing[columnId]) {
            return columnSizing[columnId];
        }
        
        switch (columnId) {
            case 'CdChamada':
                return 70;
            case 'NmProduto':
                return isMobile ? 150 : 400;
            case 'NmGrupoProduto':
                return isMobile ? 100 : 120;
            case 'NmFamiliaProduto':
                return isMobile ? 150 : 180;
            case 'NmFornecedorPrincipal':
                return isMobile ? 120 : 150;
            case 'Atualizacao':
            case 'DataInicio':
            case 'DataFim':
                return isMobile ? 140 : 160;
            case 'VlPreco_Empresa59':
            case 'PrecoPromo':
            case 'PrecoDe':
                return 120;
            case 'QtEstoque_Empresa1':
            case 'QtEstoque_Empresa4':
            case 'QtEstoque_Empresa12':
            case 'QtEstoque_Empresa59':
            case 'QtEstoque_Empresa13':
            case 'QtEstoque_Empresa15':
            case 'QtEstoque_Empresa17':
            case 'CdSigla':
                return 40;
            case 'StkTotal':
                return 100;
            default:
                return isMobile ? 100 : 120;
        }
    };

    // First, define loadProductImage
    const loadProductImage = useCallback(async (cdChamada: string) => {
        if (!cdChamada) return;
        
        // Check cache inside the function instead of using it as a dependency
        if (imageCache[cdChamada] !== undefined) return;
        
        const imageUrl = await getProductImage(cdChamada);
        setImageCache(prev => ({
            ...prev,
            [cdChamada]: imageUrl
        }));
    }, [imageCache]);

    // Then define tableConfig
    const tableConfig = useMemo(() => ({
        data: filteredData,
        columns: [
            {
                id: 'imagem',
                header: 'Imagem',
                cell: ({ row }) => {
                    const cdChamada = row.getValue('CdChamada') as string;
                    const productName = row.getValue('NmProduto') as string;
                    const imageUrl = imageCache[cdChamada];
                    
                    const handleClick = () => {
                        if (imageUrl) {
                            // If there's an image, show preview
                            setSelectedImage(imageUrl);
                        } else {
                            // If no image, open image manager
                            setSelectedProduct({ code: cdChamada, name: productName });
                        }
                    };
                    
                    return (
                        <>
                            <div 
                                className="w-12 h-12 relative cursor-pointer"
                                onClick={handleClick}
                            >
                                {imageUrl ? (
                                    <Image
                                        src={imageUrl}
                                        alt="Produto"
                                        fill
                                        className="object-contain hover:scale-105 transition-transform duration-200"
                                        sizes="48px"
                                    />
                                ) : (
                                    <div className="w-full h-full bg-gray-100 hover:bg-gray-200 transition-colors flex items-center justify-center">
                                        <span className="text-xs text-gray-400">Sem imagem</span>
                                    </div>
                                )}
                            </div>
                        </>
                    );
                },
                size: 60,
                minSize: 60,
                maxSize: 60,
            }
        ].concat(
            Array.from(visibleColumns).map(columnId => ({
                id: columnId,
                accessorKey: columnId,
                header: ({ column }: { column: any }) => {
                    const columnDef = columnDefinitions[columnId];
                    const label = columnDef?.label || columnId;
                    
                    return (
                        <div className="flex items-center gap-2">
                            <span>{label}</span>
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
                    
                    if (columnId === 'CdChamada') {
                        const currentParams = new URLSearchParams(searchParams)
                        const returnUrl = `/inventory?${currentParams.toString()}`
                        
                        return (
                            <Link
                                href={`/produto/${value.trim()}?returnUrl=${encodeURIComponent(returnUrl)}`}
                                className="text-blue-500 hover:text-blue-700 underline"
                            >
                                {formattedValue}
                            </Link>
                        )
                    }
                    
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

                    if (
                        columnId.startsWith('QtEstoque_') || 
                        columnId === 'StkTotal' ||
                        columnId.startsWith('VlPreco') ||
                        columnId === 'PrecoPromo' ||
                        columnId === 'PrecoDe'
                    ) {
                        return (a as number) > (b as number) ? 1 : -1
                    }

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
                size: getColumnSize(columnId),
                minSize: columnId === 'NmProduto' ? 150 : 80,
                maxSize: columnId === 'NmProduto' ? 600 : 400,
            }))
        ),
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
        onColumnOrderChange: (updater: any) => {
            const newOrder = typeof updater === 'function' ? updater(columnOrder) : updater;
            // Preserve exact order, only filter out non-visible columns
            const validOrder = newOrder.filter(id => visibleColumns.has(id as ColumnId));
            
            // Only add missing visible columns at the end
            const missingColumns = Array.from(visibleColumns).filter(id => !validOrder.includes(id));
            
            const finalOrder = [...validOrder, ...missingColumns];
            setColumnOrder(finalOrder);
            localStorage.setItem('inventoryColumnOrder', JSON.stringify(finalOrder));
        },
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
    }), [
        filteredData,
        visibleColumns,
        searchTerm,
        formatCellValue,
        columnOrder,
        columnSizing,
        sorting,
        pageIndex,
        pageSize,
        isMobile,
        imageCache,
        searchParams
    ]);

    // Initialize the table
    const table = useReactTable(tableConfig);

    // Now we can add the effect that uses the table
    useEffect(() => {
        const loadVisibleImages = async () => {
            const visibleRows = table.getRowModel().rows;
            const cdChamadas = visibleRows.map(row => row.getValue('CdChamada') as string);
            
            // Filter out products that are already in cache
            const unloadedCdChamadas = cdChamadas.filter(
                cdChamada => cdChamada && imageCache[cdChamada] === undefined
            );
            
            // Load images in parallel
            await Promise.all(
                unloadedCdChamadas.map(cdChamada => loadProductImage(cdChamada))
            );
        };
        
        loadVisibleImages();
    }, [pageIndex, sorting, filteredData]); // Remove table from dependencies, use pageIndex and sorting instead

    // Add this function to handle column reordering
    const handleColumnReorder = useCallback((draggedColumnId: string, targetColumnId: string) => {
        const allColumnIds = Object.keys(columnDefinitions);
        
        if (!allColumnIds.includes(draggedColumnId) || !allColumnIds.includes(targetColumnId)) {
            return;
        }

        setColumnOrder(currentOrder => {
            // Remove any duplicates first
            const uniqueOrder = Array.from(new Set(currentOrder));
            const newOrder = [...uniqueOrder];
            
            // Get correct indices
            const currentIndex = newOrder.indexOf(draggedColumnId);
            const targetIndex = newOrder.indexOf(targetColumnId);
            
            if (currentIndex !== -1 && targetIndex !== -1) {
                // Remove from current position
                newOrder.splice(currentIndex, 1);
                // Insert at new position
                newOrder.splice(targetIndex, 0, draggedColumnId);
                
                // Save the new order immediately
                localStorage.setItem('inventoryColumnOrder', JSON.stringify(newOrder));
                return newOrder;
            }
            
            return currentOrder;
        });
    }, []);

    // Update the handleHideColumn function
    const handleHideColumn = (columnId: string) => {
        if (visibleColumns.size <= 1) return; // Prevent hiding all columns
        
        setVisibleColumns(prev => {
            const next = new Set(prev);
            next.delete(columnId as ColumnId);
            // Save visible columns to localStorage
            localStorage.setItem('inventoryColumns', JSON.stringify(Array.from(next)));
            return next;
        });
        
        // Update column order and save it
        setColumnOrder(current => {
            const newOrder = current.filter(id => id !== columnId);
            localStorage.setItem('inventoryColumnOrder', JSON.stringify(newOrder));
            return newOrder;
        });
    };

    // Modifique a função toggleGroup
    const toggleGroup = (group: string) => {
        let newSelection: string[];
        
        setSelectedGroups(current => {
            // Se selecionando "Todos os grupos"
            if (group === ALL_GROUPS) {
                newSelection = [ALL_GROUPS];
            }
            // Se já está selecionado, remove
            else if (current.includes(group)) {
                newSelection = current.filter(g => g !== group);
                // Se ficou vazio, seleciona "Todos os grupos"
                newSelection = newSelection.length === 0 ? [ALL_GROUPS] : newSelection;
            }
            // Se adicionando novo grupo
            else {
                newSelection = current.filter(g => g !== ALL_GROUPS);
                newSelection = [...newSelection, group];
            }
            
            return newSelection;
        });

        // Move a atualização da URL para fora do setSelectedGroups
        const params = new URLSearchParams(searchParams);
        if (newSelection.length === 1 && newSelection[0] === ALL_GROUPS) {
            params.delete('groups');
        } else {
            params.set('groups', encodeURIComponent(JSON.stringify(newSelection)));
        }
        
        // Mantém o parâmetro de busca se existir
        if (searchTerm) {
            params.set('q', searchTerm);
        }
        
        // Usa setTimeout para evitar a atualização durante a renderização
        setTimeout(() => {
            router.replace(`/inventory?${params.toString()}`);
        }, 0);
    };

    // Adicione esta função para atualizar o cache de uma imagem específica
    const updateProductImage = useCallback(async (cdChamada: string) => {
        try {
            const imageUrl = await getProductImage(cdChamada);
            setImageCache(prev => ({
                ...prev,
                [cdChamada]: imageUrl
            }));
        } catch (error) {
            console.error('Error updating product image:', error);
        }
    }, []);

    // Adicione esta função para lidar com a mudança do filtro de estoque
    const handleStockFilterChange = () => {
        const newValue = !showOnlyInStock;
        setShowOnlyInStock(newValue);
        localStorage.setItem('showOnlyInStock', JSON.stringify(newValue));
    };

    const handleViewModeChange = (mode: ViewMode) => {
        setViewMode(mode);
        localStorage.setItem('inventoryViewMode', mode);
    };

    if (isLoading) {
        return <InventoryLoading />
    }

    return (
        <PermissionGuard permission="inventory">
            <div className="space-y-6">
                <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center flex-col">
                        <h1 className="text-3xl font-bold">Consulta Estoque</h1>
                        <div className="flex items-center gap-4 py-4">
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
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <CardTitle>Lista de Produtos</CardTitle>
                            <div className="w-full sm:w-auto sm:flex-1">
                                <div className="flex flex-col sm:flex-row gap-2 justify-end">
                                    {/* First row/group with buttons */}
                                    <div className="flex gap-2">
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    role="combobox"
                                                    className="w-[250px] justify-between"
                                                >
                                                    {selectedGroups.includes(ALL_GROUPS) 
                                                        ? "Todos os grupos" 
                                                        : `${selectedGroups.length} grupo(s)`}
                                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[250px] p-0" align="start">
                                                <Command>
                                                    <CommandInput placeholder="Buscar grupo..." className="h-9" />
                                                    <CommandList className="max-h-[300px] overflow-auto">
                                                        <CommandEmpty>Nenhum grupo encontrado.</CommandEmpty>
                                                        <CommandGroup>
                                                            <CommandItem
                                                                value={ALL_GROUPS}
                                                                onSelect={() => toggleGroup(ALL_GROUPS)}
                                                            >
                                                                <Check
                                                                    className={cn(
                                                                        "mr-2 h-4 w-4",
                                                                        selectedGroups.includes(ALL_GROUPS) 
                                                                            ? "opacity-100" 
                                                                            : "opacity-0"
                                                                    )}
                                                                />
                                                                Todos os grupos
                                                            </CommandItem>
                                                            {getUniqueGroups(data).map((group) => (
                                                                <CommandItem
                                                                    key={group}
                                                                    value={group}
                                                                    onSelect={() => toggleGroup(group)}
                                                                >
                                                                    <Check
                                                                        className={cn(
                                                                            "mr-2 h-4 w-4",
                                                                            selectedGroups.includes(group) 
                                                                                ? "opacity-100" 
                                                                                : "opacity-0"
                                                                        )}
                                                                    />
                                                                    {group}
                                                                </CommandItem>
                                                            ))}
                                                        </CommandGroup>
                                                    </CommandList>
                                                </Command>
                                            </PopoverContent>
                                        </Popover>
                                        <Button
                                            variant={showOnlyInStock ? "default" : "outline"}
                                            size="sm"
                                            onClick={handleStockFilterChange}
                                            className="whitespace-nowrap"
                                        >
                                            {showOnlyInStock ? "Com Estoque" : "Todos"}
                                        </Button>
                                        <div className="flex items-center border rounded-md">
                                            <Button
                                                variant={viewMode === 'table' ? "default" : "ghost"}
                                                size="sm"
                                                onClick={() => handleViewModeChange('table')}
                                                className="rounded-r-none"
                                            >
                                                <TableIcon className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant={viewMode === 'grid' ? "default" : "ghost"}
                                                size="sm"
                                                onClick={() => handleViewModeChange('grid')}
                                                className="rounded-l-none"
                                            >
                                                <LayoutGrid className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                    {/* Second row/group with search input */}
                                    <Input
                                        placeholder="Buscar em todos os campos..."
                                        value={searchTerm}
                                        onChange={(e) => handleSearch(e.target.value)}
                                        className="w-96 text-xs sm:text-sm sm:min-w-[100px]"
                                    />
                                </div>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {viewMode === 'table' ? (
                            <div className="relative overflow-x-auto">
                                <Table style={TABLE_STYLES}>
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
                                                        className={cn(
                                                            "px-2 first:pl-4 last:pr-4",
                                                            roboto.className,
                                                            "text-xs sm:text-sm",
                                                            cell.column.id === 'NmGrupoProduto' && "max-w-[100px] sm:max-w-[120px] truncate",
                                                            cell.column.id === 'NmProduto' && "max-w-[200px] sm:max-w-[600px]",
                                                            cell.column.id === 'NmFornecedorPrincipal' && "max-w-[120px] sm:max-w-[150px] truncate" // Add truncate for supplier
                                                        )}
                                                        style={{
                                                            width: cell.column.getSize(),
                                                            maxWidth: cell.column.getSize(),
                                                            whiteSpace: cell.column.id === 'NmGrupoProduto' ? 'nowrap' : 'normal',
                                                            wordBreak: cell.column.id === 'NmGrupoProduto' ? 'normal' : 'break-word'
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
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                                {table.getRowModel().rows.map((row) => {
                                    const cdChamada = row.getValue('CdChamada') as string;
                                    const productName = row.getValue('NmProduto') as string;
                                    const imageUrl = imageCache[cdChamada];
                                    const stock = row.getValue('StkTotal') as number;
                                    const price = row.getValue('VlPreco_Empresa59') as number;
                                    
                                    return (
                                        <div 
                                            key={row.id}
                                            className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
                                        >
                                            <div 
                                                className="relative aspect-square cursor-pointer"
                                                onClick={() => {
                                                    if (imageUrl) {
                                                        setSelectedImage(imageUrl);
                                                    } else {
                                                        setSelectedProduct({ code: cdChamada, name: productName });
                                                    }
                                                }}
                                            >
                                                {imageUrl ? (
                                                    <Image
                                                        src={imageUrl}
                                                        alt={productName}
                                                        fill
                                                        className="object-contain p-2"
                                                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full bg-gray-50 flex items-center justify-center">
                                                        <span className="text-sm text-gray-400">Sem imagem</span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="p-3 space-y-2">
                                                <Link
                                                    href={`/produto/${cdChamada.trim()}`}
                                                    className="text-sm font-medium text-blue-600 hover:text-blue-800 line-clamp-2"
                                                >
                                                    {productName}
                                                </Link>
                                                <div className="flex justify-between items-center text-sm">
                                                    <span className="text-gray-600">
                                                        Estoque: {stock}
                                                    </span>
                                                    <span className="font-medium">
                                                        {price?.toLocaleString('pt-BR', { 
                                                            style: 'currency', 
                                                            currency: 'BRL' 
                                                        })}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

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

                {lastUpdate && (
                    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 bg-black text-white px-6 py-3 rounded-full shadow-lg flex flex-col items-center">
                        
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

                {selectedImage && (
                    <ImagePreviewModal
                        isOpen={!!selectedImage}
                        onClose={() => setSelectedImage(null)}
                        imageUrl={selectedImage}
                    />
                )}
                
                {selectedProduct && (
                    <ManageProductImagesModal
                        isOpen={!!selectedProduct}
                        onClose={() => setSelectedProduct(null)}
                        productCode={selectedProduct.code}
                        productName={selectedProduct.name}
                        onImageUpdate={() => updateProductImage(selectedProduct.code)}
                    />
                )}
            </div>
        </PermissionGuard>
    )
}