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
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
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

interface PageState {
  sorting: SortingState;
  columnOrder: string[];
  columnSizing: Record<string, number>;
  searchTerm: string;
  selectedGroups: string[];
  showOnlyInStock: boolean;
  viewMode: ViewMode;
  pageIndex: number;
}

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

function safeEncode(data: any): string {
  try {
    const jsonString = JSON.stringify(data);
    return btoa(encodeURIComponent(jsonString));
  } catch (error) {
    console.error('Error encoding state:', error);
    return '';
  }
}

function safeDecode(encoded: string): any {
  try {
    const jsonString = decodeURIComponent(atob(encoded));
    return JSON.parse(jsonString);
  } catch (error) {
    console.error('Error decoding state:', error);
    return null;
  }
}

function savePageState(state: PageState) {
  if (typeof window === 'undefined') return;
  try {
    const encoded = safeEncode(state);
    sessionStorage.setItem('inventoryPageState', encoded);
  } catch (error) {
    console.error('Error saving page state:', error);
  }
}

function loadPageState(): PageState | null {
  if (typeof window === 'undefined') return null;
  try {
    const encoded = sessionStorage.getItem('inventoryPageState');
    if (!encoded) return null;
    return safeDecode(encoded);
  } catch (error) {
    console.error('Error loading page state:', error);
    return null;
  }
}

export default function Inventory() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const pathname = usePathname()
    const tableContainerRef = useRef<HTMLDivElement>(null);
    
    // Add debounce utility function
    const debounce = (func: Function, wait: number) => {
        let timeout: NodeJS.Timeout;
        return function executedFunction(...args: any[]) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    };

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

    // Load saved state on component mount
    const [initialStateLoaded, setInitialStateLoaded] = useState(false);

    // Add these state variables near the other state declarations
    const [isSearching, setIsSearching] = useState(false);
    const [searchProgress, setSearchProgress] = useState(0);

    useEffect(() => {
        if (!initialStateLoaded) {
            const savedState = loadPageState();
            if (savedState) {
                setSorting(savedState.sorting);
                setColumnOrder(savedState.columnOrder);
                setColumnSizing(savedState.columnSizing);
                setSearchTerm(savedState.searchTerm);
                setSelectedGroups(savedState.selectedGroups);
                setShowOnlyInStock(savedState.showOnlyInStock);
                setViewMode(savedState.viewMode);
                setPageIndex(savedState.pageIndex);
            }
            setInitialStateLoaded(true);
        }
    }, [initialStateLoaded]);

    // Add effect to save state when relevant values change
    useEffect(() => {
        if (!initialStateLoaded) return;

        const currentState: PageState = {
            sorting,
            columnOrder,
            columnSizing,
            searchTerm,
            selectedGroups,
            showOnlyInStock,
            viewMode,
            pageIndex,
        };

        savePageState(currentState);
    }, [
        sorting,
        columnOrder,
        columnSizing,
        searchTerm,
        selectedGroups,
        showOnlyInStock,
        viewMode,
        pageIndex,
        initialStateLoaded
    ]);

    // Add this effect to handle returning to the page
    useEffect(() => {
        if (searchParams.has('inventoryPageState')) {
            try {
                const stateParam = searchParams.get('inventoryPageState');
                if (stateParam) {
                    const decompressedState = safeDecode(stateParam);
                    if (decompressedState) {
                        setSorting(decompressedState.sorting);
                        setColumnOrder(decompressedState.columnOrder);
                        setColumnSizing(decompressedState.columnSizing);
                        setSearchTerm(decompressedState.searchTerm);
                        setSelectedGroups(decompressedState.selectedGroups);
                        setShowOnlyInStock(decompressedState.showOnlyInStock);
                        setViewMode(decompressedState.viewMode);
                        setPageIndex(decompressedState.pageIndex);
                    }
                }
                
                // Remove the state parameter from URL without triggering a reload
                const newParams = new URLSearchParams(searchParams);
                newParams.delete('inventoryPageState');
                router.replace(`${pathname}?${newParams.toString()}`, { scroll: false });
            } catch (error) {
                console.error('Error restoring page state:', error);
            }
        }
    }, [searchParams, router, pathname]);

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
        
        // Cria um Map para contar SKUs únicos por grupo
        const groupCountMap = new Map<string, Set<string>>();
        
        // Conta SKUs únicos por grupo
        itemsWithStock.forEach(item => {
            const group = item.NmGrupoProduto;
            const cdChamada = item.CdChamada;
            
            if (!groupCountMap.has(group)) {
                groupCountMap.set(group, new Set());
            }
            groupCountMap.get(group)?.add(cdChamada);
        });
        
        // Converte para array com formato "(count) GroupName" e ordena
        return Array.from(groupCountMap.entries())
            .map(([group, skus]) => `(${skus.size}) ${group}`)
            .sort((a, b) => {
                // Extrai o número entre parênteses para ordenar por quantidade
                const countA = parseInt(a.match(/\((\d+)\)/)?.[1] || '0');
                const countB = parseInt(b.match(/\((\d+)\)/)?.[1] || '0');
                return countB - countA; // Ordena do maior para o menor
            });
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
                filtered = filtered.filter(item => 
                    selectedGroups.some(group => {
                        // Remove a contagem do nome do grupo para comparação
                        const cleanGroup = group.replace(/^\(\d+\)\s*/, '');
                        return item.NmGrupoProduto === cleanGroup;
                    })
                );
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
    }, [data, visibleColumns, searchTerm, selectedGroups, showOnlyInStock]);

    // Update the debouncedSearch to be memoized with useCallback
    const debouncedSearch = useCallback(
        useDebouncedCallback((searchValue: string) => {
            // Show a loading indicator during search
            setIsSearching(true);
            
            // Use a more aggressive debounce on mobile
            setTimeout(() => {
                // Start with all data
                let filtered = data;

                // 1. Aplicar filtro de estoque primeiro
                if (showOnlyInStock) {
                    filtered = filtered.filter(item => item.StkTotal > 0);
                }

                // 2. Se não há termo de busca, retorna os dados filtrados até aqui
                if (!searchValue.trim()) {
                    setFilteredData(filtered);
                    setIsSearching(false);
                    return;
                }

                // 3. Split and normalize search terms, separating include and exclude terms
                const terms = searchValue
                    .trim()
                    .toLowerCase()
                    .split(/\s+/)
                    .filter(term => term.length >= 2); // Ignore terms shorter than 2 characters

                const includedTerms: string[] = [];
                const excludedTerms: string[] = [];

                terms.forEach(term => {
                    if (term.startsWith('-')) {
                        const cleanTerm = term.slice(1); // Remove the '-' prefix
                        if (cleanTerm.length >= 2) { // Only add if term is still long enough
                            excludedTerms.push(cleanTerm);
                        }
                    } else {
                        includedTerms.push(term);
                    }
                });

                // Create a memoized search string builder
                const getSearchString = (item: InventoryItem) => {
                    if (!item) return '';
                    
                    // Priorize certain fields for better matching
                    const priorityFields = ['CdChamada', 'NmProduto', 'NmGrupoProduto'];
                    const otherFields = Array.from(visibleColumns).filter(field => !priorityFields.includes(field));
                    
                    // Concatenate priority fields first
                    const searchString = [
                        ...priorityFields.map(field => {
                            const value = item[field as keyof InventoryItem];
                            if (value === null || value === undefined) return '';
                            return String(value).toLowerCase();
                        }),
                        ...otherFields.map(field => {
                            const value = item[field as keyof InventoryItem];
                            if (value === null || value === undefined) return '';
                            
                            if (field === 'Atualizacao' || field === 'DataInicio' || field === 'DataFim') {
                                if (!value) return '';
                                return new Date(value as string).toLocaleString('pt-BR', { timeZone: 'UTC' });
                            }
                            
                            if (field.startsWith('VlPreco') || field === 'PrecoPromo' || field === 'PrecoDe') {
                                return (value as number).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                            }
                            
                            if (field.startsWith('QtEstoque') || field === 'StkTotal') {
                                return (value as number).toLocaleString('pt-BR');
                            }
                            
                            return String(value);
                        })
                    ].join(' ').toLowerCase();

                    return searchString;
                };

                // 4. Batch process items for better performance
                const batchSize = isMobile ? 25 : 100; // Smaller batch size for mobile
                const results: InventoryItem[] = [];
                let processedCount = 0;
                
                // Use a more efficient approach with requestAnimationFrame for smoother UI
                const processBatch = (startIndex: number) => {
                    const endIndex = Math.min(startIndex + batchSize, filtered.length);
                    const batch = filtered.slice(startIndex, endIndex);
                    
                    const batchResults = batch.filter(item => {
                        const searchString = getSearchString(item);
                        
                        // Check if all included terms are present
                        const hasAllIncludedTerms = includedTerms.length === 0 || 
                            includedTerms.every(term => searchString.includes(term));
                        
                        // Check if any excluded terms are present
                        const hasNoExcludedTerms = excludedTerms.length === 0 || 
                            !excludedTerms.some(term => searchString.includes(term));
                        
                        // Item matches if it has all included terms AND none of the excluded terms
                        return hasAllIncludedTerms && hasNoExcludedTerms;
                    });
                    
                    results.push(...batchResults);
                    processedCount = endIndex;
                    
                    // Update progress for UI feedback
                    setSearchProgress(Math.floor((endIndex / filtered.length) * 100));
                    
                    // If we're on mobile, update results progressively for better UX
                    if (isMobile && results.length > 0 && (endIndex % (batchSize * 2) === 0 || endIndex === filtered.length)) {
                        setFilteredData([...results]);
                    }
                    
                    // Continue processing if there are more items
                    if (endIndex < filtered.length) {
                        // Use requestAnimationFrame to avoid blocking the UI
                        requestAnimationFrame(() => processBatch(endIndex));
                    } else {
                        // All done
                        setFilteredData(results);
                        setIsSearching(false);
                        setSearchProgress(100);
                    }
                };
                
                // Start processing
                processBatch(0);
                
            }, 0);
        }, isMobile ? 600 : 300), // Increase debounce time for mobile
        [data, visibleColumns, isMobile, showOnlyInStock]
    );

    // Update search term and trigger search
    const handleSearch = (value: string) => {
        setSearchTerm(value);
        
        // If the search term is very short, don't trigger search yet
        if (value.length < 2) {
            setIsSearching(false);
            if (value.length === 0) {
                // Reset to all data if search is cleared
                const filtered = showOnlyInStock ? data.filter(item => item.StkTotal > 0) : data;
                setFilteredData(filtered);
            }
            return;
        }
        
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
        
        // Show immediate feedback that search is starting
        setIsSearching(true);
        setSearchProgress(0);
        
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
                return isMobile ? 150 : 300;
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
            case 'QtEstoque_Empresa20':
                return 110;
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
                        try {
                            // Create URL with current state
                            const currentParams = new URLSearchParams(searchParams);
                            const savedState = sessionStorage.getItem('inventoryPageState') || '';
                            // Create a minimal state object if needed
                            const stateParam = savedState ? `&inventoryPageState=${encodeURIComponent(savedState)}` : '';
                            const returnUrl = `/inventory?${currentParams.toString()}${stateParam}`;
                            
                            return (
                                <Link
                                    href={`/produto/${value.trim()}?returnUrl=${encodeURIComponent(returnUrl)}`}
                                    className="text-blue-500 hover:text-blue-700 underline"
                                >
                                    {formattedValue}
                                </Link>
                            );
                        } catch (error) {
                            console.error('Error creating product link:', error);
                            return formattedValue;
                        }
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
                        // Ensure we're comparing numbers, with null/undefined treated as 0
                        const numA = a === null || a === undefined ? 0 : Number(a);
                        const numB = b === null || b === undefined ? 0 : Number(b);
                        return numA > numB ? 1 : numA < numB ? -1 : 0;
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

                    // For string comparison, handle null/undefined values
                    const strA = a === null || a === undefined ? '' : String(a);
                    const strB = b === null || b === undefined ? '' : String(b);
                    return strA.localeCompare(strB, 'pt-BR')
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

    // Update the loadVisibleImages function
    useEffect(() => {
        const loadVisibleImages = async () => {
            // Get only the rows that are currently visible in the paginated view
            const visibleRows = table.getRowModel().rows.slice(
                pageIndex * pageSize,
                (pageIndex + 1) * pageSize
            );
            
            // Create a batch of promises for all uncached images
            const imagePromises = visibleRows
                .map(row => row.getValue('CdChamada') as string)
                .filter(cdChamada => cdChamada && imageCache[cdChamada] === undefined)
                .map(async cdChamada => {
                    try {
                        const imageUrl = await getProductImage(cdChamada);
                        return { cdChamada, imageUrl, error: null };
                    } catch (error: any) {
                        return { 
                            cdChamada, 
                            imageUrl: null, 
                            error: error?.message?.includes('contains 0 rows') ? 'no_image' : error 
                        };
                    }
                });

            if (imagePromises.length === 0) return;

            // Process all images in parallel and update cache once
            const results = await Promise.all(imagePromises);
            
            setImageCache(prev => {
                const updates = results.reduce((acc, { cdChamada, imageUrl }) => {
                    acc[cdChamada] = imageUrl;
                    return acc;
                }, {} as Record<string, string | null>);

                return { ...prev, ...updates };
            });
        };

        if (!isLoading) {
            loadVisibleImages();
        }
    }, [table, pageIndex, pageSize, isLoading]); // Removed imageCache from dependencies

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

    // Update the toggleGroup function to only handle state
    const toggleGroup = (group: string) => {
        setSelectedGroups(current => {
            // Calculate new selection
            let newSelection: string[];
            
            // If selecting "All groups"
            if (group === ALL_GROUPS) {
                newSelection = [ALL_GROUPS];
            }
            // If already selected, remove
            else if (current.includes(group)) {
                newSelection = current.filter(g => g !== group);
                // If empty, select "All groups"
                if (newSelection.length === 0) {
                    newSelection = [ALL_GROUPS];
                }
            }
            // If adding new group
            else {
                newSelection = current.filter(g => g !== ALL_GROUPS);
                newSelection = [...newSelection, group];
            }

            return newSelection;
        });
    };

    // Add this effect to handle URL updates when selectedGroups changes
    useEffect(() => {
        const params = new URLSearchParams(searchParams);
        
        if (selectedGroups.length === 1 && selectedGroups[0] === ALL_GROUPS) {
            params.delete('groups');
        } else {
            // Remove the count from group names before saving to URL
            const cleanGroups = selectedGroups.map(g => 
                g === ALL_GROUPS ? g : g.replace(/^\(\d+\)\s*/, '')
            );
            params.set('groups', encodeURIComponent(JSON.stringify(cleanGroups)));
        }
        
        // Keep search parameter if it exists
        if (searchTerm) {
            params.set('q', searchTerm);
        }
        
        // Update URL
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }, [selectedGroups, searchTerm, searchParams, router, pathname]);

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
                                    <div className="relative w-full sm:w-96">
                                        <Input
                                            placeholder="Buscar em todos os campos..."
                                            value={searchTerm}
                                            onChange={(e) => handleSearch(e.target.value)}
                                            className="w-full text-xs sm:text-sm"
                                        />
                                        {isSearching && (
                                            <div className="absolute -bottom-6 left-0 right-0">
                                                <div className="w-full bg-gray-200 rounded-full h-1.5">
                                                    <div 
                                                        className="bg-blue-600 h-1.5 rounded-full transition-all duration-300 ease-in-out" 
                                                        style={{ width: `${searchProgress}%` }}
                                                    ></div>
                                                </div>
                                                <div className="text-xs text-gray-500 text-right mt-1">
                                                    {searchProgress < 100 ? 'Buscando...' : ''}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {viewMode === 'table' ? (
                            <div className="relative overflow-x-auto" ref={tableContainerRef}>
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
                                            <TableRow 
                                                key={row.id}
                                                className={cn(
                                                    (row.original && row.original.StkTotal !== undefined && row.original.StkTotal <= 0) && "text-gray-400 bg-gray-50"
                                                )}
                                            >
                                                {row.getVisibleCells().map((cell) => (
                                                    <TableCell 
                                                        key={cell.id}
                                                        className={cn(
                                                            "px-2 first:pl-4 last:pr-4",
                                                            roboto.className,
                                                            "text-xs sm:text-sm",
                                                            cell.column.id === 'NmGrupoProduto' && "max-w-[100px] sm:max-w-[120px] truncate",
                                                            cell.column.id === 'NmProduto' && "max-w-[200px] sm:max-w-[600px]",
                                                            cell.column.id === 'NmFornecedorPrincipal' && "max-w-[120px] sm:max-w-[150px] truncate",
                                                            cell.column.id === 'StkTotal' && row.original && row.original.StkTotal !== undefined && row.original.StkTotal <= 0 && "text-gray-400"
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
                                    const fornecedor = row.getValue('NmFornecedorPrincipal') as string;
                                    const hasNoStock = stock <= 0;
                                    
                                    return (
                                        <div 
                                            key={row.id}
                                            className={cn(
                                                "bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow",
                                                hasNoStock && "bg-gray-50"
                                            )}
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
                                                        className={cn(
                                                            "object-contain p-2",
                                                            hasNoStock && "opacity-75"
                                                        )}
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
                                                    className={cn(
                                                        "text-sm font-medium line-clamp-2",
                                                        hasNoStock ? "text-gray-500" : "text-blue-600 hover:text-blue-800"
                                                    )}
                                                >
                                                    {productName}
                                                </Link>
                                                <div className="flex items-center gap-1">
                                                    <span 
                                                        className={cn(
                                                            "inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-light truncate max-w-[200px]",
                                                            hasNoStock ? "bg-gray-200 text-gray-600" : "bg-gray-300 text-black"
                                                        )}
                                                        title={fornecedor}
                                                    >
                                                        {fornecedor || 'Sem fornecedor'}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between items-center text-sm">
                                                    <span className={cn(
                                                        hasNoStock ? "text-gray-400" : "text-gray-600"
                                                    )}>
                                                        Estoque: {stock}
                                                    </span>
                                                    <span className={cn(
                                                        "font-medium",
                                                        hasNoStock ? "text-gray-400" : "text-gray-900"
                                                    )}>
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