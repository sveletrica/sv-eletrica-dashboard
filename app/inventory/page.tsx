'use client';
import { PermissionGuard } from '../../components/guards/permission-guard';
import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { Button } from "../../components/ui/button";
import { ColumnSelector } from "../../components/column-selector";
import { columnDefinitions, ColumnId, InventoryItem } from "../../types/inventory";
import { RefreshCw } from "lucide-react";
import InventoryLoading from './loading';
import { cn } from '../../lib/utils';
import {
    flexRender,
    getCoreRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    SortingState,
    useReactTable,
    ColumnResizeMode,
} from '@tanstack/react-table';
import './styles.css';
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
    ContextMenuSeparator,
} from "../../components/ui/context-menu";
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { HighlightedText } from "../../components/highlighted-text";
import { compressData, decompressData } from '../../lib/utils';
import { useDebouncedCallback } from 'use-debounce';
import Fuse from 'fuse.js';
import { Roboto } from 'next/font/google';
import Link from 'next/link';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "../../components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "../../components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import Image from 'next/image';
import { ImagePreviewModal } from "../../components/image-preview-modal";
import { ManageProductImagesModal } from "../../components/manage-product-images-modal";
import { LayoutGrid, Table as TableIcon } from "lucide-react";
import React from 'react';
import { Switch } from "@/components/ui/switch";

const roboto = Roboto({
    weight: ['400', '500'],
    subsets: ['latin'],
    display: 'swap',
});

const CACHE_KEY = 'inventoryData';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

interface CachedData {
    items: InventoryItem[]
    timestamp: number
}

interface SearchableItem {
    item: InventoryItem;
    searchString: string;
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
    );
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
    const router = useRouter();
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const tableContainerRef = useRef<HTMLDivElement>(null);

    // Add debounce utility function
    const debounce = <T extends (...args: any[]) => void>(func: T, wait: number) => {
        let timeout: NodeJS.Timeout;
        return function executedFunction(...args: Parameters<T>) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    };

    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '');
    const [data, setData] = useState<InventoryItem[]>([]);
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
    const [visibleColumns, setVisibleColumns] = useState<Set<ColumnId>>(getDefaultVisibleColumns());
    const [error, setError] = useState<string | null>(null);
    const [pageSize] = useState(40);
    const [pageIndex, setPageIndex] = useState(0);
    const [columnOrder, setColumnOrder] = useState<string[]>(loadSavedColumnOrder());
    const [columnSizing, setColumnSizing] = useState<Record<string, number>>({});
    const [columnResizeMode] = useState<ColumnResizeMode>('onChange');
    const [sorting, setSorting] = useState<SortingState>([]);
    const [searchTerms, setSearchTerms] = useState<string[]>([]);
    const [filteredData, setFilteredData] = useState<InventoryItem[]>([]);
    const [searchableData, setSearchableData] = useState<SearchableItem[]>([]);
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
            return localStorage.getItem('inventoryViewMode') as ViewMode || 'table';
        }
        return 'table';
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
        setIsRefreshing(true);
        await fetchInventoryData(true);
    };

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

    // Create optimized search strings for each item
const getSearchString = useCallback((item: InventoryItem): string => {
    // Only include the most relevant fields for search to improve performance
    const searchFields = ['CdChamada', 'NmProduto', 'NmFornecedorPrincipal', 'NmGrupoProduto'];
    
    return searchFields.map(field => {
        const value = item[field as keyof InventoryItem];
        if (value === null || value === undefined) return '';
        return String(value).toLowerCase();
    }).join(' ');
}, []);

// Process and memoize search terms
const processedSearchTerms = useMemo(() => {
    if (!searchTerm.trim()) {
        return { includedTerms: [], excludedTerms: [] };
    }
    
    const terms = searchTerm
        .trim()
        .toLowerCase()
        .split(/\s+/)
        .filter(term => term.length >= 2);
    
    return {
        includedTerms: terms.filter(term => !term.startsWith('-')),
        excludedTerms: terms
            .filter(term => term.startsWith('-'))
            .map(term => term.slice(1))
            .filter(term => term.length >= 2)
    };
}, [searchTerm]);

// Create searchable data whenever the base data changes
useEffect(() => {
    if (data.length > 0) {
        // Create searchable data once and reuse it for all searches
        const newSearchableData = data.map(item => ({
            item,
            searchString: getSearchString(item)
        }));
        
        setSearchableData(newSearchableData);
    }
}, [data, getSearchString]);

// Unified filter function that handles all filtering in one pass
const getFilteredData = useCallback(() => {
    if (!searchableData.length) return [];
    
    // Start with all searchable items
    let results = searchableData;
    
    // Apply group filter
    if (!selectedGroups.includes(ALL_GROUPS)) {
        results = results.filter(({ item }) =>
            selectedGroups.some(group => {
                // Remove the count from the group name for comparison
                const cleanGroup = group.replace(/^\(\d+\)\s*/, '');
                return item.NmGrupoProduto === cleanGroup;
            })
        );
    }
    
    // Apply stock filter
    if (showOnlyInStock) {
        results = results.filter(({ item }) => item.StkTotal > 0);
    }
    
    // Apply search filter if there are search terms
    if (processedSearchTerms.includedTerms.length > 0 || processedSearchTerms.excludedTerms.length > 0) {
        results = results.filter(({ searchString }) => {
            // Check if all included terms are present
            const hasAllIncludedTerms = processedSearchTerms.includedTerms.length === 0 ||
                processedSearchTerms.includedTerms.every(term => searchString.includes(term));
            
            // Check if any excluded terms are present
            const hasNoExcludedTerms = processedSearchTerms.excludedTerms.length === 0 ||
                !processedSearchTerms.excludedTerms.some(term => searchString.includes(term));
            
            // Item matches if it has all included terms AND none of the excluded terms
            return hasAllIncludedTerms && hasNoExcludedTerms;
        });
    }
    
    // Return the actual items, not the searchable items
    return results.map(({ item }) => item);
}, [searchableData, selectedGroups, showOnlyInStock, processedSearchTerms]);

// Update filtered data whenever filters change
useEffect(() => {
    // Skip if no data is available yet
    if (data.length === 0) return;
    
    setIsSearching(true);
    setSearchProgress(0);
    
    // Use timeout to avoid blocking the main thread
    const timeoutId = setTimeout(() => {
        const filtered = getFilteredData();
        setFilteredData(filtered);
        setIsSearching(false);
        setSearchProgress(100);
    }, 0);
    
    return () => clearTimeout(timeoutId);
}, [data.length, getFilteredData]);

    // Optimized debouncedSearch using our precomputed searchable data
    const debouncedSearch = useCallback(
        useDebouncedCallback((searchValue: string) => {
            // Don't search if the searchable data isn't ready
            if (searchableData.length === 0) {
                setIsSearching(false);
                return;
            }

            // Show loading indicator
            setIsSearching(true);
            setSearchProgress(0);

            // Run search in the next tick to prevent UI freezing
            setTimeout(() => {
                // If search is empty, just apply filters without search
                if (!searchValue.trim()) {
                    // Apply filters without search term
                    let filtered = searchableData;
                
                    // Apply group filter
                    if (!selectedGroups.includes(ALL_GROUPS)) {
                        filtered = filtered.filter(({ item }) =>
                            selectedGroups.some(group => {
                                const cleanGroup = group.replace(/^\(\d+\)\s*/, '');
                                return item.NmGrupoProduto === cleanGroup;
                            })
                        );
                    }
                    
                    // Apply stock filter
                    if (showOnlyInStock) {
                        filtered = filtered.filter(({ item }) => item.StkTotal > 0);
                    }
                    
                    setFilteredData(filtered.map(({ item }) => item));
                    setIsSearching(false);
                    setSearchProgress(100);
                    return;
                }

                // Process search terms
                const terms = searchValue
                    .trim()
                    .toLowerCase()
                    .split(/\s+/)
                    .filter(term => term.length >= 2);

                const includedTerms = terms.filter(term => !term.startsWith('-'));
                const excludedTerms = terms
                    .filter(term => term.startsWith('-'))
                    .map(term => term.slice(1))
                    .filter(term => term.length >= 2);

                // First, apply non-search filters to reduce the dataset we need to search
                let filtered = searchableData;
                
                // Apply group filter first
                if (!selectedGroups.includes(ALL_GROUPS)) {
                    filtered = filtered.filter(({ item }) =>
                        selectedGroups.some(group => {
                            const cleanGroup = group.replace(/^\(\d+\)\s*/, '');
                            return item.NmGrupoProduto === cleanGroup;
                        })
                    );
                }
                
                // Apply stock filter
                if (showOnlyInStock) {
                    filtered = filtered.filter(({ item }) => item.StkTotal > 0);
                }

                // Use batch processing for smoother UI on large datasets
                const totalItems = filtered.length;
                const batchSize = isMobile ? 100 : 500; // Larger batch size since we pre-computed searchStrings
                const results: InventoryItem[] = [];
                
                // Progress tracking
                const updateProgress = (processed: number) => {
                    const progress = Math.floor((processed / totalItems) * 100);
                    setSearchProgress(progress);
                };

                // Use the new batch processing approach
                const processBatch = (startIndex: number) => {
                    if (startIndex >= totalItems) {
                        // All done
                        setFilteredData(results);
                        setIsSearching(false);
                        setSearchProgress(100);
                        return;
                    }

                    const endIndex = Math.min(startIndex + batchSize, totalItems);
                    const batch = filtered.slice(startIndex, endIndex);

                    // Process this batch
                    for (let i = 0; i < batch.length; i++) {
                        const { item, searchString } = batch[i];
                        
                        // Check if all included terms are present
                        const hasAllIncludedTerms = includedTerms.length === 0 ||
                            includedTerms.every(term => searchString.includes(term));
                        
                        // Check if any excluded terms are present
                        const hasNoExcludedTerms = excludedTerms.length === 0 ||
                            !excludedTerms.some(term => searchString.includes(term));
                        
                        // Item matches if it has all included terms AND none of the excluded terms
                        if (hasAllIncludedTerms && hasNoExcludedTerms) {
                            results.push(item);
                        }
                    }

                    // Update progress
                    updateProgress(endIndex);
                    
                    // On mobile, update results progressively
                    if (isMobile && results.length > 0) {
                        setFilteredData([...results]);
                    }

                    // Process next batch using requestAnimationFrame for smoother UI
                    requestAnimationFrame(() => processBatch(endIndex));
                };

                // Start processing
                processBatch(0);
            }, 0);
        }, isMobile ? 300 : 150), // Reduced debounce time since search is faster now
        [searchableData, selectedGroups, showOnlyInStock, isMobile]
    );

    // Update search term and trigger search
    const handleSearch = (value: string) => {
        setSearchTerm(value);

        // Create a new URLSearchParams object to avoid reference issues
        const params = new URLSearchParams(searchParams.toString());

        // Handle groups parameter consistently regardless of search value
        if (selectedGroups.length === 1 && selectedGroups[0] === ALL_GROUPS) {
            params.delete('groups');
        } else {
            params.set('groups', encodeURIComponent(JSON.stringify(selectedGroups)));
        }

        // If search is cleared, remove the 'q' parameter
        if (!value || value.length === 0) {
            console.log("Search cleared, removing 'q' parameter");
            params.delete('q');

            // Use replace to update URL without adding to history
            const newUrl = `/inventory${params.toString() ? `?${params.toString()}` : ''}`;
            console.log("New URL after clearing search:", newUrl);

            // Use replace with scroll: false to update URL without scrolling or adding to history
            router.replace(newUrl, { scroll: false });

            // The filtered data will be updated by our effect instead of doing it here
            return;
        }

        // If the search term is very short, don't trigger search yet
        if (value.length < 2) {
            // Still update URL even for short searches
            params.set('q', value);
            const newUrl = `/inventory?${params.toString()}`;
            router.replace(newUrl, { scroll: false });
            
            // Don't set searching to false here, let the debounced function handle it
            return;
        }

        params.set('q', value);
        const newUrl = `/inventory?${params.toString()}`;
        console.log("New URL after search:", newUrl);
        router.replace(newUrl, { scroll: false });

        // Use the optimized debounced search
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
                cell: ({ row }: { row: any }) => {
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
            },
            ...Array.from(visibleColumns).map(columnId => ({
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
                    );
                },
                cell: ({ getValue, row }: { getValue: () => any, row: any }) => {
                    const value = getValue();
                    const formattedValue = formatCellValue(value, columnId);

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
                                    {searchTerm && typeof formattedValue === 'string' ? (
                                        <HighlightedText
                                            text={formattedValue}
                                            searchTerms={searchTerm.trim().toLowerCase().split(/\s+/)}
                                        />
                                    ) : formattedValue}
                                </Link>
                            );
                        } catch (error) {
                            console.error('Error creating product link:', error);
                            return formattedValue;
                        }
                    }

                    // Truncate supplier name with ellipsis
                    if (columnId === 'NmFornecedorPrincipal' && typeof formattedValue === 'string') {
                        return (
                            <div className="truncate max-w-[150px]" title={formattedValue}>
                                {formattedValue}
                            </div>
                        );
                    }
                    
                    // Truncate group name with ellipsis
                    if (columnId === 'NmGrupoProduto' && typeof formattedValue === 'string') {
                        return (
                            <div className="truncate w-full" title={formattedValue}>
                                {searchTerm && formattedValue ? (
                                    <HighlightedText
                                        text={formattedValue}
                                        searchTerms={searchTerm.trim().toLowerCase().split(/\s+/)}
                                    />
                                ) : formattedValue}
                            </div>
                        );
                    }

                    // Only highlight search terms in the fields we're actually searching
                    if (searchTerm && typeof formattedValue === 'string' &&
                        ['CdChamada', 'NmProduto', 'NmFornecedorPrincipal'].includes(columnId)) {
                        return (
                            <HighlightedText
                                text={formattedValue}
                                searchTerms={searchTerm.trim().toLowerCase().split(/\s+/)}
                            />
                        );
                    }

                    return formattedValue;
                },
                sortingFn: (rowA: any, rowB: any, columnId: string) => {
                    const a = rowA.getValue(columnId);
                    const b = rowB.getValue(columnId);

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
                        const dateA = a ? new Date(a as string) : new Date(0);
                        const dateB = b ? new Date(b as string) : new Date(0);
                        return dateA.getTime() - dateB.getTime();
                    }

                    // For string comparison, handle null/undefined values
                    const strA = a === null || a === undefined ? '' : String(a);
                    const strB = b === null || b === undefined ? '' : String(b);
                    return strA.localeCompare(strB, 'pt-BR');
                },
                size: getColumnSize(columnId),
                minSize: columnId === 'NmProduto' ? 150 : 80,
                maxSize: columnId === 'NmProduto' ? 600 : 400,
            }))
        ],
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
            const validOrder = newOrder.filter((id: string) => visibleColumns.has(id as ColumnId));

            // Only add missing visible columns at the end
            const missingColumns = Array.from(visibleColumns).filter((id: string) => !validOrder.includes(id));

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
                const newState = updater({ pageIndex, pageSize });
                setPageIndex(newState.pageIndex);
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
    // Effect for loading images when page changes or filtered data changes
    useEffect(() => {
        let mounted = true;
        const controller = new AbortController();

        const loadVisibleImages = async () => {
            if (!mounted) return;

            // Get paginated data directly from the current page
            const paginatedData = table.getPaginationRowModel().rows;

            if (!paginatedData.length) return;

            // Create a batch of promises for all uncached images on this page
            const uncachedProducts = paginatedData
                .map(row => row.getValue('CdChamada') as string)
                .filter(cdChamada => cdChamada && imageCache[cdChamada] === undefined);

            if (uncachedProducts.length === 0) return;

            console.log(`Loading ${uncachedProducts.length} images for page ${pageIndex + 1}`);

            try {
                // Process images in batches to avoid overwhelming the network
                const batchSize = 5;
                const updatedImages = {} as Record<string, string | null>;

                for (let i = 0; i < uncachedProducts.length; i += batchSize) {
                    if (!mounted) break;

                    const batch = uncachedProducts.slice(i, i + batchSize);
                    const batchPromises = batch.map(async cdChamada => {
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

                    const batchResults = await Promise.all(batchPromises);

                    // Update cache after each batch for better UX
                    batchResults.forEach(({ cdChamada, imageUrl }) => {
                        updatedImages[cdChamada] = imageUrl;
                    });

                    if (mounted) {
                        setImageCache(prev => ({ ...prev, ...updatedImages }));
                    }
                }
            } catch (error) {
                console.error("Error loading product images:", error);
            }
        };

        // Debounce the image loading to avoid excessive API calls during rapid search/filter changes
        const timeoutId = setTimeout(() => {
            if (!isLoading) {
                loadVisibleImages();
            }
        }, 150);

        // Cleanup function to prevent memory leaks
        return () => {
            mounted = false;
            controller.abort();
            clearTimeout(timeoutId);
        };
    }, [
        table, 
        pageIndex, 
        isLoading, 
        // Add filteredData as a dependency to reload images when search results change
        filteredData.length 
    ]); // imageCache handled by table

    // Enhanced function to handle column reordering with better mobile support
    const handleColumnReorder = useCallback((draggedColumnId: string, targetColumnId: string) => {
        const allColumnIds = Object.keys(columnDefinitions);

        if (!allColumnIds.includes(draggedColumnId) || !allColumnIds.includes(targetColumnId)) {
            return;
        }
        
        // If on mobile, use the new order immediately and scroll to make it visible
        const scrollToColumnAfterReorder = (columnId: string) => {
            if (isMobile && tableContainerRef.current) {
                setTimeout(() => {
                    const columnHeader = tableContainerRef.current.querySelector(`[data-column-id="${columnId}"]`);
                    if (columnHeader) {
                        columnHeader.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                    }
                }, 100);
            }
        };

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
                
                // On mobile, provide some visual feedback
                if (isMobile) {
                    scrollToColumnAfterReorder(draggedColumnId);
                }
                
                return newOrder;
            }

            return currentOrder;
        });
    }, [isMobile]);

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
        return <InventoryLoading />;
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
                                        <Switch
                                            checked={showOnlyInStock}
                                            onCheckedChange={handleStockFilterChange}
                                            className="mr-0 mt-2"
                                        />
                                        <span className="text-sm mt-2">
                                            {showOnlyInStock ? "Stk" : "Stk"}
                                        </span>
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
                                        <div className="relative">
                                            <Input
                                                placeholder="Buscar em todos os campos..."
                                                value={searchTerm}
                                                onChange={(e) => handleSearch(e.target.value)}
                                                className="w-full text-xs sm:text-sm pr-10"
                                            />
                                            {searchTerm && (
                                                <button 
                                                    className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-gray-600"
                                                    onClick={() => {
                                                        console.log("Clear search button clicked");
                                                        
                                                        // Clear the search input - this will trigger the handleSearch function with empty value
                                                        setSearchTerm('');
                                                        
                                                        // Create a new URLSearchParams object
                                                        const params = new URLSearchParams();
                                                        
                                                        // Only add non-search parameters if needed
                                                        if (!selectedGroups.includes(ALL_GROUPS)) {
                                                            params.set('groups', encodeURIComponent(JSON.stringify(selectedGroups)));
                                                        }
                                                        
                                                        // Construct the URL
                                                        const newUrl = `/inventory${params.toString() ? `?${params.toString()}` : ''}`;
                                                        
                                                        // Use router.replace for consistent behavior with the rest of the app
                                                        router.replace(newUrl, { scroll: false });
                                                        
                                                        // The filtered data will be updated by our effect
                                                        setIsSearching(true);
                                                        setSearchProgress(0);
                                                        
                                                        // Manually trigger search with empty value to apply filters
                                                        debouncedSearch('');
                                                    }}
                                                    aria-label="Clear search"
                                                    type="button"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            )}
                                        </div>
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
                                                    data-column-id={header.column.id}
                                                    className={cn(
                                                        "whitespace-nowrap px-2 first:pl-4 last:pr-4 relative select-none group text-xs font-medium",
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
                                                                draggable={!isMobile} // Disable dragging on mobile
                                                                onDragStart={(e) => {
                                                                    if (isMobile) return; // Prevent drag start on mobile
                                                                    e.dataTransfer.setData('text/plain', header.column.id);
                                                                    e.currentTarget.classList.add('dragging');
                                                                }}
                                                                onDragEnd={(e) => {
                                                                    if (isMobile) return;
                                                                    e.currentTarget.classList.remove('dragging');
                                                                }}
                                                                onDragOver={(e) => {
                                                                    if (isMobile) return;
                                                                    e.preventDefault();
                                                                    e.currentTarget.classList.add('drop-target');
                                                                }}
                                                                onDragLeave={(e) => {
                                                                    if (isMobile) return;
                                                                    e.currentTarget.classList.remove('drop-target');
                                                                }}
                                                                onDrop={(e) => {
                                                                    if (isMobile) return;
                                                                    e.preventDefault();
                                                                    e.currentTarget.classList.remove('drop-target');
                                                                    const draggedColumnId = e.dataTransfer.getData('text/plain');
                                                                    handleColumnReorder(draggedColumnId, header.column.id);
                                                                }}
                                                                className={cn(
                                                                    "py-2 flex items-center gap-2",
                                                                    !isMobile && "cursor-move"
                                                                )}
                                                                onTouchStart={(e) => {
                                                                    // Record the column being touched for potential reordering
                                                                    if (isMobile) {
                                                                        // Touch events are handled via context menu on mobile
                                                                    }
                                                                }}
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
                                                            {isMobile && (
                                                                <>
                                                                    <ContextMenuSeparator />
                                                                    <ContextMenuItem
                                                                        onClick={() => {
                                                                            // Move column left
                                                                            const currentIndex = columnOrder.indexOf(header.column.id);
                                                                            if (currentIndex > 0) {
                                                                                const targetId = columnOrder[currentIndex - 1];
                                                                                handleColumnReorder(header.column.id, targetId);
                                                                            }
                                                                        }}
                                                                        disabled={columnOrder.indexOf(header.column.id) <= 0}
                                                                    >
                                                                        <span className="mr-2">⬅️</span>
                                                                        Mover para esquerda
                                                                    </ContextMenuItem>
                                                                    <ContextMenuItem
                                                                        onClick={() => {
                                                                            // Move column right
                                                                            const currentIndex = columnOrder.indexOf(header.column.id);
                                                                            if (currentIndex < columnOrder.length - 1) {
                                                                                const targetId = columnOrder[currentIndex + 1];
                                                                                handleColumnReorder(targetId, header.column.id);
                                                                            }
                                                                        }}
                                                                        disabled={columnOrder.indexOf(header.column.id) >= columnOrder.length - 1}
                                                                    >
                                                                        <span className="mr-2">➡️</span>
                                                                        Mover para direita
                                                                    </ContextMenuItem>
                                                                </>
                                                            )}
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
                                                                "resizer",
                                                                header.column.getIsResizing() ? "isResizing" : "",
                                                                "opacity-0 group-hover:opacity-100"
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
                                                            "px-4 py-2 text-xs",
                                                            cell.column.id === 'imagem' && "w-[60px]",
                                                            cell.column.id === 'NmProduto' && "max-w-[200px] sm:max-w-[600px]",
                                                            cell.column.id === 'StkTotal' && row.original && row.original.StkTotal <= 0 && "text-gray-400"
                                                        )}
                                                        style={{
                                                            width: cell.column.getSize(),
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
    );
}