'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Package, ChevronLeft, ChevronRight, Check, AlertTriangle, XCircle, Search, X } from 'lucide-react'
import { cn } from "@/lib/utils"
import { useSpring, animated } from '@react-spring/web'
import './styles.css'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useDebounce } from 'use-debounce'
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { useMediaQuery } from "@/hooks/use-media-query"
import { Roboto } from 'next/font/google'
import Link from 'next/link'
import { SortableColumnProps, SortDirection } from "@/components/ui/table"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceArea, ReferenceLine } from 'recharts'
import { ProductStockCard } from '@/components/product-stock-card'
import { StockPopover } from "@/components/stock-popover"
import ProductLoading from './loading'
import { PermissionGuard } from '@/components/guards/permission-guard'
import { Suspense } from 'react'
import Image from 'next/image'
import { ProductImageManager } from '@/components/product-image-manager'
import { toast } from 'sonner'

interface ProductSale {
    cdpedido: string
    nrdocumento: string
    tppessoa: string
    nmpessoa: string
    vlfaturamento: number
    vltotalcustoproduto: number
    margem: string
    cdproduto: string
    nmproduto: string
    nmgrupoproduto: string
    qtbrutaproduto: number
    dtemissao: string
    nmempresacurtovenda: string
    nmfornecedorprincipal: string
}

interface Product {
    cdproduto: string
    nmproduto: string
}

interface MonthlyData {
    month: string
    quantity: number
}

interface PriceData {
    cdchamada: string;
    vlprecosugerido: string;
    vlprecoreposicao: string;
}

interface ApiResponse {
    product: ProductSale[];
    stock: StockData[];
    price?: PriceData;
}

interface StockData {
    QtEstoque_Empresa1?: number;
    QtEstoque_Empresa4?: number;
    QtEstoque_Empresa12?: number;
    QtEstoque_Empresa13?: number;
    QtEstoque_Empresa15?: number;
    QtEstoque_Empresa17?: number;
    QtEstoque_Empresa20?: number;
    QtEstoque_Empresa59?: number;
    StkTotal: number;
    NmProduto: string;
    NmGrupoProduto: string;
    NmFornecedorPrincipal: string;
}

interface DateRange {
    start: string | null;
    end: string | null;
}

interface GoogleImageResult {
    url: string;
    alt: string;
}

// Add this font configuration after the imports
const roboto = Roboto({
    weight: ['400', '500'],
    subsets: ['latin'],
    display: 'swap',
})

// Hook personalizado para animar números
function useCountUp(end: number, duration: number = 500) {
    const [count, setCount] = useState(0)

    useEffect(() => {
        let startTimestamp: number | null = null
        const step = (timestamp: number) => {
            if (!startTimestamp) startTimestamp = timestamp
            const progress = Math.min((timestamp - startTimestamp) / duration, 1)
            setCount(Math.floor(progress * end))
            if (progress < 1) {
                window.requestAnimationFrame(step)
            } else {
                setCount(end) // Garante que chegue ao valor final exato
            }
        }
        window.requestAnimationFrame(step)
    }, [end, duration])

    return count
}

// Componente para número animado
function AnimatedValue({ value, suffix = '', formatter }: {
    value: number,
    suffix?: string,
    formatter?: (value: number) => string
}) {
    const count = useCountUp(value)
    return (
        <span>
            {formatter ? formatter(count) : count}{suffix}
        </span>
    )
}

// Função auxiliar para estilo da margem
const getMarginStyle = (margin: number) => {
    if (margin >= 4) {
        return {
            background: "bg-green-100 dark:bg-green-900",
            icon: <Check className="h-4 w-4 text-green-600 dark:text-green-400" />,
            text: "text-green-600 dark:text-green-400"
        }
    } else if (margin >= 0) {
        return {
            background: "bg-yellow-100 dark:bg-yellow-900",
            icon: <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />,
            text: "text-yellow-600 dark:text-yellow-400"
        }
    } else {
        return {
            background: "bg-red-100 dark:bg-red-900",
            icon: <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />,
            text: "text-red-600 dark:text-red-400"
        }
    }
}

// Update the normalizeStr function
const normalizeStr = (str: string | null | undefined) => {
    if (!str) return '';

    return str
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[.,]/g, '')
        .replace(/[x]/g, '');
}

// Add this function to highlight matched terms
const highlightMatches = (text: string, searchTerms: string[]) => {
    if (!searchTerms.length) return text;

    const normalizedText = normalizeStr(text);
    let result = text;
    let offset = 0;

    searchTerms.forEach(term => {
        const normalizedTerm = normalizeStr(term);
        let pos = 0;
        while ((pos = normalizedText.indexOf(normalizedTerm, pos)) !== -1) {
            const realPos = pos + offset;
            const before = result.slice(0, realPos);
            const match = result.slice(realPos, realPos + term.length);
            const after = result.slice(realPos + term.length);
            result = `${before}<mark class="bg-yellow-200 rounded-sm px-0.5">${match}</mark>${after}`;
            offset += '<mark class="bg-yellow-200 rounded-sm px-0.5">'.length + '</mark>'.length;
            pos += term.length;
        }
    });

    return result;
};

// Add these constants and helper functions at the top level
const DB_NAME = 'products_db'
const STORE_NAME = 'products'
const DB_VERSION = 1
const CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 hours

// Helper function to open IndexedDB
const openDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION)

        request.onerror = () => reject(request.error)
        request.onsuccess = () => resolve(request.result)

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'timestamp' })
            }
        }
    })
}

// Replace getStoredProducts with this version
const getStoredProducts = async (): Promise<Product[] | null> => {
    if (typeof window === 'undefined') return null

    try {
        const db = await openDB()
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readonly')
            const store = transaction.objectStore(STORE_NAME)
            const request = store.getAll()

            request.onerror = () => reject(request.error)
            request.onsuccess = () => {
                const records = request.result
                if (records.length === 0) {
                    resolve(null)
                    return
                }

                const latestRecord = records[records.length - 1]
                if (Date.now() - latestRecord.timestamp > CACHE_DURATION) {
                    // Cache expired, clear the store
                    const clearTransaction = db.transaction(STORE_NAME, 'readwrite')
                    const clearStore = clearTransaction.objectStore(STORE_NAME)
                    clearStore.clear()
                    resolve(null)
                } else {
                    resolve(latestRecord.data)
                }
            }
        })
    } catch (error) {
        console.error('Error accessing IndexedDB:', error)
        return null
    }
}

// Replace storeProducts with this version
const storeProducts = async (products: Product[]): Promise<void> => {
    if (typeof window === 'undefined') return

    try {
        const db = await openDB()
        const transaction = db.transaction(STORE_NAME, 'readwrite')
        const store = transaction.objectStore(STORE_NAME)

        // Clear old data
        await new Promise<void>((resolve, reject) => {
            const clearRequest = store.clear()
            clearRequest.onerror = () => reject(clearRequest.error)
            clearRequest.onsuccess = () => resolve()
        })

        // Store new data
        const record = {
            timestamp: Date.now(),
            data: products
        }

        return new Promise((resolve, reject) => {
            const request = store.add(record)
            request.onerror = () => reject(request.error)
            request.onsuccess = () => resolve()
        })
    } catch (error) {
        console.error('Error storing products in IndexedDB:', error)
    }
}

// Update the search logic
const searchProducts = (products: Product[], query: string) => {
    if (!query) return products.slice(0, 50);

    const searchTerms = normalizeStr(query)
        .split(' ')
        .filter(term => term.length > 0);

    return products
        .filter(product => {
            const normalizedName = normalizeStr(product.nmproduto)
            const normalizedCode = normalizeStr(product.cdproduto)

            return searchTerms.every(term =>
                normalizedName.includes(term) ||
                normalizedCode.includes(term)
            )
        })
        .slice(0, 50)
}

const SearchContent = ({
    searchQuery,
    setSearchQuery,
    filteredProducts,
    handleProductSelect
}: {
    searchQuery: string
    setSearchQuery: (value: string) => void
    filteredProducts: Product[]
    handleProductSelect: (product: Product) => void
}) => {
    return (
        <div className={cn("flex flex-col", roboto.className)}>
            <div className="flex items-center border-b p-2">
                <Search className="h-4 w-4 mr-2 shrink-0 opacity-50" />
                <input
                    className="flex w-full bg-transparent py-1.5 text-sm outline-none placeholder:text-muted-foreground"
                    placeholder="Buscar produto..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoFocus
                />
            </div>
            <div className="max-h-[300px] overflow-auto p-1">
                {filteredProducts.map((product) => {
                    const searchTerms = searchQuery
                        .split(' ')
                        .filter(term => term.length > 0);

                    const highlightedName = highlightMatches(product.nmproduto, searchTerms);
                    const highlightedCode = highlightMatches(product.cdproduto, searchTerms);

                    return (
                        <div
                            key={product.cdproduto}
                            className="flex flex-col px-2 py-1.5 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground rounded-sm"
                            onClick={() => handleProductSelect(product)}
                        >
                            <span
                                className="font-medium"
                                dangerouslySetInnerHTML={{ __html: highlightedName }}
                            />
                            <span
                                className="text-xs text-muted-foreground"
                                dangerouslySetInnerHTML={{ __html: `Código: ${highlightedCode}` }}
                            />
                        </div>
                    );
                })}
                {filteredProducts.length === 0 && (
                    <div className="py-6 text-center text-sm text-muted-foreground">
                        {searchQuery ? 'Nenhum produto encontrado.' : 'Digite para buscar produtos...'}
                    </div>
                )}
            </div>
        </div>
    )
}

type SortableColumn = 'dtemissao' | 'cdpedido' | 'nrdocumento' | 'nmpessoa' | 'tppessoa' | 'nmempresacurtovenda' | 'qtbrutaproduto' | 'vlfaturamento' | 'vltotalcustoproduto' | 'margem'

// Add these constants at the top of the file, after the imports
const SORT_STORAGE_KEY = 'product_table_sort'

// Add these helper functions
const getStoredSortConfig = (): SortableColumnProps | null => {
    if (typeof window === 'undefined') return null

    const stored = localStorage.getItem(SORT_STORAGE_KEY)
    if (!stored) return null

    try {
        return JSON.parse(stored)
    } catch (error) {
        console.error('Error parsing stored sort config:', error)
        return null
    }
}

const storeSortConfig = (config: SortableColumnProps) => {
    if (typeof window === 'undefined') return
    localStorage.setItem(SORT_STORAGE_KEY, JSON.stringify(config))
}

const prepareMonthlyData = (salesData: ProductSale[], selectedFilial: string | null): MonthlyData[] => {
    // Primeiro filtra os dados pela filial selecionada, se houver
    const filteredSales = selectedFilial 
        ? salesData.filter(sale => sale.nmempresacurtovenda === selectedFilial)
        : salesData;

    const monthlyTotals = filteredSales.reduce((acc, sale) => {
        const [day, month, year] = sale.dtemissao.split('/');
        const monthKey = `${year}-${month.padStart(2, '0')}`;

        if (!acc[monthKey]) {
            acc[monthKey] = {
                quantity: 0,
                monthStr: `${month}/${year}`
            };
        }

        acc[monthKey].quantity += sale.qtbrutaproduto;
        return acc;
    }, {} as Record<string, { quantity: number, monthStr: string }>);

    return Object.entries(monthlyTotals)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([_, data]) => ({
            month: data.monthStr,
            quantity: data.quantity
        }));
};

// Add this custom tooltip component
const CustomTooltip = ({ active, payload, label, selectedMonth }: any) => {
    if (active && payload && payload.length) {
        const isSelected = label === selectedMonth
        return (
            <div className={cn(
                "bg-background border rounded-lg shadow-lg p-2",
                isSelected && "ring-2 ring-primary"
            )}>
                <p className="font-medium">{label}</p>
                <p className="text-sm">
                    Quantidade: {payload[0].value.toLocaleString('pt-BR')}
                </p>
            </div>
        )
    }
    return null
}

// Add this helper function at the top level
const formatStockNumber = (num: number) => {
    return new Intl.NumberFormat('pt-BR').format(num);
}

// Add this helper function at the top level, outside of the component
const isDateInRange = (date: string, range: string) => {
    const [start, end] = range.split(' - ').map(d => {
        const [month, year] = d.split('/')
        return new Date(Number(year), Number(month) - 1)
    })

    const [month, year] = date.split('/')
    const checkDate = new Date(Number(year), Number(month) - 1)

    return checkDate >= start && checkDate <= end
}

// Add this function after the interfaces
async function getProductImage(productName: string): Promise<GoogleImageResult | null> {
    try {
        const response = await fetch(`/api/produto/image?query=${encodeURIComponent(productName)}`, {
            next: { revalidate: 86400 } // Cache for 24 hours
        });

        if (!response.ok) return null;

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching product image:', error);
        return null;
    }
}

// Update the ProductImageCard component
const ProductImageCard = ({ productName }: { productName: string }) => {
    const [imageData, setImageData] = useState<GoogleImageResult | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [imgError, setImgError] = useState(false);
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        const fetchImage = async () => {
            setIsLoading(true);
            setImgError(false);
            try {
                const data = await getProductImage(productName);
                setImageData(data);
            } catch (err) {
                setError('Failed to load image');
            } finally {
                setIsLoading(false);
            }
        };

        if (productName) {
            fetchImage();
        }
    }, [productName]);

    if (!productName) return null;

    return (
        <>
            <Card className="p-0">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 p-2">
                    <CardTitle className="text-xs sm:text-sm font-medium">
                        Imagem
                    </CardTitle>
                </CardHeader>
                <CardContent
                    className="flex items-center justify-center p-4"
                    onClick={() => imageData && !imgError && setShowModal(true)}
                >
                    {isLoading ? (
                        <div className="w-full h-28 bg-muted animate-pulse rounded-md" />
                    ) : error || imgError ? (
                        <div className="text-sm text-muted-foreground">
                            Não foi possível carregar a imagem
                        </div>
                    ) : imageData ? (
                        <div className="relative w-full h-28 cursor-pointer hover:opacity-90 transition-opacity">
                            <Image
                                src={imageData.url}
                                alt={imageData.alt || productName}
                                fill
                                className="object-contain rounded-md"
                                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                onError={() => setImgError(true)}
                                unoptimized
                            />
                        </div>
                    ) : (
                        <div className="text-sm text-muted-foreground">
                            Nenhuma imagem encontrada
                        </div>
                    )}
                </CardContent>
            </Card>

            <Dialog open={showModal} onOpenChange={setShowModal}>
                <DialogContent className="sm:max-w-[800px] p-0">
                    <DialogTitle className="sr-only">
                        Imagem do produto {productName}
                    </DialogTitle>
                    <div className="relative w-full h-[500px] p-4">
                        {imageData && (
                            <Image
                                src={imageData.url}
                                alt={imageData.alt || productName}
                                fill
                                className="object-contain rounded-md"
                                sizes="(max-width: 768px) 100vw, 800px"
                                onError={() => setImgError(true)}
                                unoptimized
                            />
                        )}
                    </div>
                    <div className="p-4 bg-background border-t">
                        <p className="text-sm font-medium text-center">
                            {productName}
                        </p>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
};

// Create a wrapper component for the main content
function ProductSalesDetailsContent() {
    const router = useRouter()
    const params = useParams()
    const searchParams = useSearchParams()
    const [data, setData] = useState<ApiResponse>({ product: [], stock: [] });
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [selectedFilial, setSelectedFilial] = useState<string | null>(null)
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 20
    const [inputProductCode, setInputProductCode] = useState('')
    const [isEditing, setIsEditing] = useState(false)
    const [allProducts, setAllProducts] = useState<Product[]>([])
    const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
    const [isSearchOpen, setIsSearchOpen] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [debouncedSearchQuery] = useDebounce(searchQuery, 300)
    const isMobile = useMediaQuery("(max-width: 1024px)")
    const [sortConfig, setSortConfig] = useState<SortableColumnProps>(() => {
        const stored = getStoredSortConfig()
        return stored || {
            column: 'dtemissao',
            direction: 'desc'
        }
    })
    const monthlyData = useMemo(() => 
        prepareMonthlyData(data.product, selectedFilial), 
        [data.product, selectedFilial]
    );
    const [selectedMonth, setSelectedMonth] = useState<string | null>(null)
    const [selecting, setSelecting] = useState(false)
    const [dateRange, setDateRange] = useState<DateRange>({ start: null, end: null })
    const chartRef = useRef<any>(null)
    const isFirstRender = useRef(true)

    useEffect(() => {
        const fetchData = async () => {
            const cdproduto = params?.cdproduto as string
            if (!cdproduto) return;

            setIsLoading(true)
            setError(null)

            try {
                const [productResponse, priceResponse] = await Promise.all([
                    fetch(`/api/produto/${cdproduto}`),
                    fetch(`/api/produto/${cdproduto}/preco`)
                ])

                if (!productResponse.ok) {
                    const errorData = await productResponse.json()
                    throw new Error(errorData.error || errorData.details || `Failed to fetch product data: ${productResponse.statusText}`)
                }

                const productData = await productResponse.json()

                if (!productData?.product?.length) {
                    throw new Error('No product data found')
                }

                const priceData = priceResponse.ok ? await priceResponse.json() : null

                setData({
                    ...productData,
                    price: priceData
                })
            } catch (err) {
                const error = err as Error
                console.error('Error fetching product data:', error)
                const errorMessage = error.message || 'Failed to fetch product data'
                setError(errorMessage)
                toast.error(errorMessage)
            } finally {
                setIsLoading(false)
            }
        }

        fetchData()
    }, [params])

    useEffect(() => {
        // Set initial product code when data is loaded
        if (data.product.length > 0) {
            setInputProductCode(data.product[0].cdproduto)
        }
    }, [data.product])

    useEffect(() => {
        const fetchAndStoreProducts = async () => {
            try {
                // Try to get from IndexedDB first
                const storedProducts = await getStoredProducts()
                if (storedProducts) {
                    setAllProducts(storedProducts)
                    return
                }

                // If no cached data, fetch from API
                const response = await fetch('/api/produtos')
                if (!response.ok) throw new Error('Failed to fetch products')
                const data = await response.json()
                setAllProducts(data)
                await storeProducts(data)
            } catch (error) {
                console.error('Error fetching products:', error)
            }
        }

        fetchAndStoreProducts()
    }, [])

    useEffect(() => {
        if (!isSearchOpen) {
            setFilteredProducts([])
            return
        }

        const filtered = searchProducts(allProducts, searchQuery)
        setFilteredProducts(filtered)
    }, [searchQuery, allProducts, isSearchOpen])

    const handleProductSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            const newProductCode = (e.target as HTMLInputElement).value
            if (newProductCode && newProductCode !== params.cdproduto) {
                router.push(`/produto/${newProductCode}`)
            }
            setIsEditing(false)
        }
    }

    const handleBlur = () => {
        setIsEditing(false)
        setInputProductCode(data.product[0]?.cdproduto || '')
    }

    const handleProductSelect = (product: Product) => {
        setIsSearchOpen(false)
        setInputProductCode(product.cdproduto)
        router.push(`/produto/${product.cdproduto}`)
    }

    const handleBack = () => {
        const returnUrl = searchParams.get('returnUrl')
        if (returnUrl) {
            router.push(returnUrl)
        } else {
            router.back()
        }
    }

    const handleSort = (column: SortableColumn) => {
        setSortConfig(prev => {
            const newConfig: SortableColumnProps = {
                column,
                direction: prev.column === column
                    ? prev.direction === 'asc'
                        ? 'desc'
                        : prev.direction === 'desc'
                            ? null
                            : 'asc'
                    : 'asc'
            }
            storeSortConfig(newConfig)
            return newConfig
        })
    }

    const filteredData = useMemo(() => {
        let filtered = [...data.product]

        // Apply sorting
        if (sortConfig.direction) {
            filtered.sort((a, b) => {
                if (sortConfig.column === 'dtemissao') {
                    const [dayA, monthA, yearA] = a.dtemissao.split('/').map(Number)
                    const [dayB, monthB, yearB] = b.dtemissao.split('/').map(Number)
                    const dateA = new Date(yearA, monthA - 1, dayA)
                    const dateB = new Date(yearB, monthB - 1, dayB)
                    return sortConfig.direction === 'asc'
                        ? dateA.getTime() - dateB.getTime()
                        : dateB.getTime() - dateA.getTime()
                }

                if (sortConfig.column === 'qtbrutaproduto' || sortConfig.column === 'vlfaturamento' || sortConfig.column === 'vltotalcustoproduto') {
                    return sortConfig.direction === 'asc'
                        ? Number(a[sortConfig.column]) - Number(b[sortConfig.column])
                        : Number(b[sortConfig.column]) - Number(a[sortConfig.column])
                }

                // Type assertion to handle string indexing
                const compareA = String((a as any)[sortConfig.column]).toLowerCase()
                const compareB = String((b as any)[sortConfig.column]).toLowerCase()

                return sortConfig.direction === 'asc'
                    ? compareA.localeCompare(compareB)
                    : compareB.localeCompare(compareA)
            })
        }

        // Apply filial filter
        if (selectedFilial) {
            filtered = filtered.filter(item => item.nmempresacurtovenda === selectedFilial)
        }

        // Apply month filter
        if (selectedMonth) {
            if (selectedMonth.includes(' - ')) {
                // Range filter
                filtered = filtered.filter(sale => {
                    const [, saleMonth, saleYear] = sale.dtemissao.split('/')
                    const saleDate = `${saleMonth}/${saleYear}`
                    return isDateInRange(saleDate, selectedMonth)
                })
            } else {
                // Single month filter
                const [month, year] = selectedMonth.split('/')
                filtered = filtered.filter(sale => {
                    const [, saleMonth, saleYear] = sale.dtemissao.split('/')
                    return saleMonth === month && saleYear === year
                })
            }
        }

        return filtered
    }, [data.product, selectedMonth, selectedFilial, sortConfig])

    const handleMonthClick = (props: any) => {
        if (props && props.activeLabel) {
            setSelectedMonth(selectedMonth === props.activeLabel ? null : props.activeLabel)
        }
    }

    // Move the memoized calculations here, before any conditional returns
    const totals = useMemo(() => {
        if (!filteredData?.length) return { faturamento: 0, quantidade: 0 }
        return filteredData.reduce((acc, item) => ({
            faturamento: acc.faturamento + item.vlfaturamento,
            quantidade: acc.quantidade + item.qtbrutaproduto
        }), { faturamento: 0, quantidade: 0 })
    }, [filteredData])

    const filialTotals = useMemo(() => {
        if (!filteredData?.length) return {}
        return filteredData.reduce((acc, item) => {
            const filial = item.nmempresacurtovenda
            if (!acc[filial]) {
                acc[filial] = {
                    quantidade: 0,
                    faturamento: 0,
                    custo: 0
                }
            }
            acc[filial].quantidade += item.qtbrutaproduto
            acc[filial].faturamento += item.vlfaturamento
            acc[filial].custo += item.vltotalcustoproduto
            return acc
        }, {} as Record<string, { quantidade: number, faturamento: number, custo: number }>)
    }, [filteredData])

    const stockDisplay = useMemo(() => {
        if (!data?.stock?.length) return { total: 0, filialCount: 0 }

        const stockData = data.stock[0]
        if (!stockData) return { total: 0, filialCount: 0 }

        const filialCount = Object.keys(stockData)
            .filter(key => key.startsWith('QtEstoque_') && stockData[key as keyof StockData] > 0)
            .length

        return {
            total: stockData.StkTotal || 0,
            filialCount
        }
    }, [data.stock])

    const calculateMargin = (faturamento: number, custo: number) => {
        return ((faturamento - (faturamento * 0.268 + custo)) / faturamento) * 100
    }

    // Add this helper function near the top of the component
    const hasSales = useMemo(() => {
        return totals?.quantidade > 0 || totals?.faturamento > 0;
    }, [totals]);

    // Then handle conditional returns
    if (!data.product.length && !isLoading) {
        return (
            <div className="space-y-6">
                <Button
                    variant="ghost"
                    onClick={handleBack}
                    className="mb-4"
                >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Voltar
                </Button>
                <Card>
                    <CardHeader>
                        <CardTitle>Buscar Produto</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex flex-col items-center justify-center p-8 text-center">
                            <Package className="h-10 w-10 text-muted-foreground mb-4" />
                            <h3 className="text-lg font-semibold mb-2">
                                Nenhum produto selecionado
                            </h3>
                            <p className="text-sm text-muted-foreground mb-4">
                                Digite o código ou nome do produto para começar
                            </p>

                            {isMobile ? (
                                <>
                                    <Button
                                        className="w-full max-w-sm"
                                        onClick={() => setIsSearchOpen(true)}
                                    >
                                        <Search className="h-4 w-4 mr-2" />
                                        Buscar Produto
                                    </Button>
                                    <Dialog open={isSearchOpen} onOpenChange={setIsSearchOpen}>
                                        <DialogContent className="sm:max-w-[425px] p-0">
                                            <DialogTitle className="sr-only">
                                                Buscar Produto
                                            </DialogTitle>
                                            <SearchContent
                                                searchQuery={searchQuery}
                                                setSearchQuery={setSearchQuery}
                                                filteredProducts={filteredProducts}
                                                handleProductSelect={handleProductSelect}
                                            />
                                        </DialogContent>
                                    </Dialog>
                                </>
                            ) : (
                                <Popover open={isSearchOpen} onOpenChange={setIsSearchOpen}>
                                    <PopoverTrigger asChild>
                                        <Button className="w-full max-w-sm">
                                            <Search className="h-4 w-4 mr-2" />
                                            Buscar Produto
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="p-0 w-[400px]" align="center">
                                        <SearchContent
                                            searchQuery={searchQuery}
                                            setSearchQuery={setSearchQuery}
                                            filteredProducts={filteredProducts}
                                            handleProductSelect={handleProductSelect}
                                        />
                                    </PopoverContent>
                                </Popover>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    if (isLoading) return <ProductLoading />

    if (!data.product.length) {
        return (
            <div className="space-y-6">
                <Button
                    variant="ghost"
                    onClick={handleBack}
                    className="mb-4"
                >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Voltar
                </Button>
                <Card>
                    <CardContent className="p-6">
                        <p className="text-center text-muted-foreground">
                            Nenhuma venda encontrada para este produto.
                        </p>
                    </CardContent>
                </Card>
            </div>
        )
    }

    // Calculate derived values that don't need memoization
    const sortedFilials = Object.entries(filialTotals)
        .sort(([, a], [, b]) => b.quantidade - a.quantidade)

    const maxQuantity = Math.max(...Object.values(filialTotals).map(v => v.quantidade))

    // Paginação
    const totalPages = Math.ceil(filteredData.length / itemsPerPage)
    const currentItems = filteredData.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    )

    return (
        <PermissionGuard permission="inventory">
            <div className="space-y-2">
                <Button
                    variant="ghost"
                    onClick={handleBack}
                    className="mb-0 w-full justify-end"
                >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Voltar
                </Button>

                {error ? (
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex flex-col items-center justify-center text-center space-y-4">
                                <AlertTriangle className="h-12 w-12 text-destructive" />
                                <p className="text-lg font-medium text-destructive">{error}</p>
                                <Button
                                    variant="outline"
                                    onClick={() => fetchData()}
                                >
                                    Tentar novamente
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <>
                        <h1 className="text-3xl font-bold tracking-tight flex justify-center">Detalhe do Produto</h1>

                        <div className="grid gap-2 grid-cols-3 md:grid-cols-7">
                            <Card
                                className="h-full cursor-pointer hover:ring-2 hover:ring-primary/50"
                                onClick={() => !isEditing && setIsEditing(true)}
                            >
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 p-2">
                                    <CardTitle className="text-xs sm:text-sm font-medium">
                                        Código do Produto
                                    </CardTitle>
                                    <Package className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent className="p-2 md:p-4">
                                    {isEditing ? (
                                        <input
                                            type="text"
                                            value={inputProductCode}
                                            onChange={(e) => setInputProductCode(e.target.value)}
                                            onKeyDown={handleProductSearch}
                                            onBlur={handleBlur}
                                            className="w-full text-2xl font-bold bg-transparent border-none focus:outline-none focus:ring-0"
                                            autoFocus
                                        />
                                    ) : (
                                        <div className="text-2xl font-bold truncate product-code">
                                            {data.product[0]?.cdproduto}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            <Card
                                className="h-full col-span-2 md:col-span-2 cursor-pointer hover:ring-2 hover:ring-primary/50"
                                onClick={() => setIsSearchOpen(true)}
                            >
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 p-2">
                                    <CardTitle className="text-xs sm:text-sm font-medium">
                                        Descrição
                                    </CardTitle>
                                    <Search className="h-4 w-4" />
                                </CardHeader>
                                <CardContent className="p-2 md:p-4">
                                    <div className="text-sm md:text-xl font-bold break-words">
                                        {data.stock[0]?.NmProduto || data.product[0]?.nmproduto}
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-2">
                                        Grupo: {data.stock[0]?.NmGrupoProduto || data.product[0]?.nmgrupoproduto}
                                        <br />
                                        Fornecedor: {data.stock[0]?.NmFornecedorPrincipal || data.product[0]?.nmfornecedorprincipal}
                                    </div>
                                </CardContent>
                                <Dialog open={isSearchOpen} onOpenChange={setIsSearchOpen}>
                                    <DialogContent className="sm:max-w-[425px] p-0">
                                        <DialogTitle className="sr-only">
                                            Buscar Produto
                                        </DialogTitle>
                                        <SearchContent
                                            searchQuery={searchQuery}
                                            setSearchQuery={setSearchQuery}
                                            filteredProducts={filteredProducts}
                                            handleProductSelect={handleProductSelect}
                                        />
                                    </DialogContent>
                                </Dialog>
                            </Card>

                            <div className="col-span-3 md:col-span-1">
                                <ProductImageManager
                                    productCode={data.product[0]?.cdproduto || ''}
                                    productName={data.product[0]?.nmproduto || ''}
                                />
                            </div>

                            <Card className="h-full">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 p-2">
                                    <CardTitle className="text-xs sm:text-sm font-medium">
                                        Total Vendido {selectedMonth && `(${selectedMonth})`}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-2 md:p-4">
                                    <div className="text-sm md:text-xl font-bold">
                                        <AnimatedValue value={totals.quantidade} suffix=" un" />
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        <AnimatedValue
                                            value={totals.faturamento}
                                            formatter={(value) => value.toLocaleString('pt-BR', {
                                                style: 'currency',
                                                currency: 'BRL'
                                            })}
                                        />
                                    </p>
                                </CardContent>
                            </Card>

                            {data.stock && data.stock[0] && (
                                <StockPopover stockData={data.stock[0]}>
                                    <Card className="h-full cursor-pointer hover:ring-2 hover:ring-primary/50">
                                        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-2">
                                            <CardTitle className="text-xs sm:text-sm font-medium">
                                                Estoque Total
                                            </CardTitle>
                                            <Package className="h-4 w-4 text-muted-foreground" />
                                        </CardHeader>
                                        <CardContent className="p-2 md:p-4">
                                            <div className="text-sm md:text-xl font-bold">
                                                <AnimatedValue value={stockDisplay.total} suffix=" un" />
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                                Em {stockDisplay.filialCount} filiais
                                            </p>
                                        </CardContent>
                                    </Card>
                                </StockPopover>
                            )}

                            {data.price && (
                                <Card className="h-full">
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 p-2">
                                        <CardTitle className="text-xs sm:text-sm font-medium">
                                            Preços
                                        </CardTitle>
                                        <Package className="h-4 w-4 text-muted-foreground" />
                                    </CardHeader>
                                    <CardContent className="p-2 md:p-4">
                                        <div className="space-y-2">
                                            <div>
                                                <div className="text-xs md:text-sm text-muted-foreground">
                                                    Preço Sugerido
                                                </div>
                                                <div className="text-xs md:text-xl font-bold">
                                                    {Number(data.price.vlprecosugerido || 0).toLocaleString('pt-BR', {
                                                        style: 'currency',
                                                        currency: 'BRL',
                                                        minimumFractionDigits: 2,
                                                        maximumFractionDigits: 2
                                                    })}
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-xs md:text-sm text-muted-foreground">
                                                    Preço Reposição
                                                </div>
                                                <div className="text-xs md:text-xl font-bold">
                                                    {Number(data.price.vlprecoreposicao || 0).toLocaleString('pt-BR', {
                                                        style: 'currency',
                                                        currency: 'BRL',
                                                        minimumFractionDigits: 2,
                                                        maximumFractionDigits: 2
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </div>

                        {/* Only show sales-related cards if there are sales */}
                        {hasSales ? (
                            <>
                                <div className={cn(
                                    "grid gap-2",
                                    isMobile ? "grid-cols-1" : "grid-cols-2"
                                )}>
                                    <Card className={cn(
                                        isMobile && "col-span-1"
                                    )}>
                                        <CardHeader>
                                            <div className="h-8 flex justify-between items-center">
                                                <CardTitle className="text-sm font-medium">
                                                    Vendas por Filial
                                                </CardTitle>
                                                {selectedFilial ? (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => setSelectedFilial(null)}
                                                    >
                                                        Limpar Filtro
                                                    </Button>
                                                ) : (
                                                    <div className="invisible">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="opacity-0"
                                                        >
                                                            Placeholder
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        </CardHeader>
                                        <CardContent>
                                            <div className={cn(
                                                "overflow-x-auto",
                                                isMobile && "max-h-[300px]"
                                            )}>
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead>Filial</TableHead>
                                                            <TableHead className="text-right">Quantidade</TableHead>
                                                            <TableHead className="text-right">Faturamento</TableHead>
                                                            <TableHead className="text-right">Margem</TableHead>
                                                            <TableHead className="text-right">% do Total</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {sortedFilials.map(([filial, values]) => {
                                                            const percentage = (values.quantidade / totals.quantidade) * 100
                                                            const margin = calculateMargin(values.faturamento, values.custo)
                                                            return (
                                                                <TableRow
                                                                    key={filial}
                                                                    className={cn(
                                                                        "relative cursor-pointer hover:bg-accent/100 transition-colors duration-200",
                                                                        selectedFilial === filial && [
                                                                            "bg-primary/10 dark:bg-primary/20",
                                                                            "shadow-sm"
                                                                        ],
                                                                        roboto.className,
                                                                        "text-xs sm:text-sm"
                                                                    )}
                                                                    onClick={() => setSelectedFilial(filial === selectedFilial ? null : filial)}
                                                                >
                                                                    <TableCell className="font-medium py-2">{filial}</TableCell>
                                                                    <TableCell className="text-right py-2">
                                                                        <AnimatedValue value={values.quantidade} suffix=" un" />
                                                                    </TableCell>
                                                                    <TableCell className="text-right py-2">
                                                                        <AnimatedValue
                                                                            value={values.faturamento}
                                                                            formatter={(value) => value.toLocaleString('pt-BR', {
                                                                                style: 'currency',
                                                                                currency: 'BRL'
                                                                            })}
                                                                        />
                                                                    </TableCell>
                                                                    <TableCell className="text-right py-2">
                                                                        {margin >= 0 ? (
                                                                            <div className="flex justify-end">
                                                                                <div className={cn(
                                                                                    "inline-flex items-center gap-1 rounded-full px-2 py-1",
                                                                                    getMarginStyle(margin).background,
                                                                                    getMarginStyle(margin).text
                                                                                )}>
                                                                                    <AnimatedValue
                                                                                        value={margin}
                                                                                        formatter={(value) => value.toFixed(2)}
                                                                                        suffix="%"
                                                                                    />
                                                                                    {getMarginStyle(margin).icon}
                                                                                </div>
                                                                            </div>
                                                                        ) : (
                                                                            <div className="flex justify-end">
                                                                                <div className={cn(
                                                                                    "inline-flex items-center gap-1 rounded-full px-2 py-1",
                                                                                    getMarginStyle(margin).background,
                                                                                    getMarginStyle(margin).text
                                                                                )}>
                                                                                    {getMarginStyle(margin).icon}
                                                                                    <AnimatedValue
                                                                                        value={margin}
                                                                                        formatter={(value) => value.toFixed(2)}
                                                                                        suffix="%"
                                                                                    />
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </TableCell>
                                                                    <TableCell className="text-right py-2">
                                                                        <div className="relative">
                                                                            <div
                                                                                className="absolute inset-0 bg-blue-200 rounded-full animate-expand"
                                                                                style={{
                                                                                    width: `${(values.quantidade / maxQuantity) * 100}%`,
                                                                                    opacity: 0.5,
                                                                                    transformOrigin: 'left',
                                                                                }}
                                                                            />
                                                                            <span className="relative z-10">
                                                                                <AnimatedValue
                                                                                    value={(values.quantidade / totals.quantidade) * 100}
                                                                                    formatter={(value) => value.toFixed(1)}
                                                                                    suffix="%"
                                                                                />
                                                                            </span>
                                                                        </div>
                                                                    </TableCell>
                                                                </TableRow>
                                                            )
                                                        })}
                                                        <TableRow className={cn("font-bold", roboto.className, "text-xs sm:text-sm")}>
                                                            <TableCell>Total</TableCell>
                                                            <TableCell className="text-right">
                                                                <AnimatedValue value={totals.quantidade} suffix=" un" />
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                <AnimatedValue
                                                                    value={totals.faturamento}
                                                                    formatter={(value) => value.toLocaleString('pt-BR', {
                                                                        style: 'currency',
                                                                        currency: 'BRL'
                                                                    })}
                                                                />
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                {calculateMargin(totals.faturamento, filteredData.reduce((acc, item) => acc + item.vltotalcustoproduto, 0)) >= 0 ? (
                                                                    <div className="flex justify-end">
                                                                        <div className={cn(
                                                                            "inline-flex items-center gap-1 rounded-full px-2 py-1",
                                                                            getMarginStyle(calculateMargin(totals.faturamento, filteredData.reduce((acc, item) => acc + item.vltotalcustoproduto, 0))).background,
                                                                            getMarginStyle(calculateMargin(totals.faturamento, filteredData.reduce((acc, item) => acc + item.vltotalcustoproduto, 0))).text
                                                                        )}>
                                                                            <AnimatedValue
                                                                                value={calculateMargin(totals.faturamento, filteredData.reduce((acc, item) => acc + item.vltotalcustoproduto, 0))}
                                                                                formatter={(value) => value.toFixed(2)}
                                                                                suffix="%"
                                                                            />
                                                                            {getMarginStyle(calculateMargin(totals.faturamento, filteredData.reduce((acc, item) => acc + item.vltotalcustoproduto, 0))).icon}
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <div className="flex justify-end">
                                                                        <div className={cn(
                                                                            "inline-flex items-center gap-1 rounded-full px-2 py-1",
                                                                            getMarginStyle(calculateMargin(totals.faturamento, filteredData.reduce((acc, item) => acc + item.vltotalcustoproduto, 0))).background,
                                                                            getMarginStyle(calculateMargin(totals.faturamento, filteredData.reduce((acc, item) => acc + item.vltotalcustoproduto, 0))).text
                                                                        )}>
                                                                            {getMarginStyle(calculateMargin(totals.faturamento, filteredData.reduce((acc, item) => acc + item.vltotalcustoproduto, 0))).icon}
                                                                            <AnimatedValue
                                                                                value={calculateMargin(totals.faturamento, filteredData.reduce((acc, item) => acc + item.vltotalcustoproduto, 0))}
                                                                                formatter={(value) => value.toFixed(2)}
                                                                                suffix="%"
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </TableCell>
                                                            <TableCell className="text-right">100%</TableCell>
                                                        </TableRow>
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <Card className={cn(
                                        isMobile && "col-span-1"
                                    )}>
                                        <CardHeader>
                                            <div className="h-8 flex justify-between items-center">
                                                <CardTitle className="text-sm font-medium">
                                                    Tendência de Vendas
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
                                            <div className={cn(
                                                "w-full",
                                                isMobile ? "h-[150px]" : "h-[300px]"
                                            )}>
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <AreaChart
                                                        data={monthlyData}
                                                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                                                        onClick={handleMonthClick}
                                                        onMouseDown={(e) => {
                                                            if (e && e.activeLabel) {
                                                                setSelecting(true)
                                                                setDateRange({ start: e.activeLabel, end: null })
                                                            }
                                                        }}
                                                        onMouseMove={(e) => {
                                                            if (selecting && e && e.activeLabel) {
                                                                setDateRange(prev => ({
                                                                    ...prev,
                                                                    end: e.activeLabel as string
                                                                }))
                                                            }
                                                        }}
                                                        onMouseUp={() => {
                                                            setSelecting(false)
                                                            if (dateRange.start && dateRange.end) {
                                                                const [start, end] = [dateRange.start, dateRange.end].sort((a, b) => {
                                                                    const [monthA, yearA] = a.split('/')
                                                                    const [monthB, yearB] = b.split('/')
                                                                    return new Date(Number(yearA), Number(monthA) - 1).getTime() -
                                                                        new Date(Number(yearB), Number(monthB) - 1).getTime()
                                                                })
                                                                setSelectedMonth(`${start} - ${end}`)
                                                            }
                                                        }}
                                                        ref={chartRef}
                                                    >
                                                        <defs>
                                                            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                                                <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                                                                <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                                                            </linearGradient>
                                                        </defs>
                                                        <CartesianGrid strokeDasharray="3 3" />
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
                                                                }).format(value)
                                                            }
                                                        />

                                                        <Area
                                                            key="quantity-area"
                                                            type="monotone"
                                                            dataKey="quantity"
                                                            stroke="#2563eb"
                                                            strokeWidth={2}
                                                            fill="url(#colorValue)"
                                                            isAnimationActive={isFirstRender.current}
                                                            onAnimationEnd={() => {
                                                                isFirstRender.current = false
                                                            }}
                                                            dot={(props: any) => {
                                                                const isInRange = selectedMonth?.includes(' - ')
                                                                    ? isDateInRange(props.payload.month, selectedMonth)
                                                                    : selectedMonth === props.payload.month
                                                                return (
                                                                    <circle
                                                                        key={`dot-${props.payload.month}`}
                                                                        cx={props.cx}
                                                                        cy={props.cy}
                                                                        r={isInRange ? 6 : 4}
                                                                        fill={isInRange ? "#2563eb" : "#fff"}
                                                                        stroke="#2563eb"
                                                                        strokeWidth={isInRange ? 3 : 2}
                                                                        className={cn(
                                                                            "transition-all duration-200",
                                                                            isInRange && "drop-shadow-md"
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

                                                        {/* Reference lines for selected range */}
                                                        {selectedMonth?.includes(' - ') && !selecting && (
                                                            <>
                                                                <ReferenceLine
                                                                    x={selectedMonth.split(' - ')[0]}
                                                                    stroke="#2563eb"
                                                                    strokeDasharray="3 3"
                                                                    strokeWidth={2}
                                                                    isFront={true}
                                                                    label={{
                                                                        value: '',
                                                                        position: 'top',
                                                                        fill: '#2563eb',
                                                                        fontSize: 12
                                                                    }}
                                                                />
                                                                <ReferenceLine
                                                                    x={selectedMonth.split(' - ')[1]}
                                                                    stroke="#2563eb"
                                                                    strokeDasharray="3 3"
                                                                    strokeWidth={2}
                                                                    isFront={true}
                                                                    label={{
                                                                        value: '',
                                                                        position: 'top',
                                                                        fill: '#2563eb',
                                                                        fontSize: 12
                                                                    }}
                                                                />
                                                            </>
                                                        )}

                                                        {/* Reference lines while selecting */}
                                                        {selecting && dateRange.start && dateRange.end && (
                                                            <>
                                                                <ReferenceLine
                                                                    x={dateRange.start}
                                                                    stroke="#2563eb"
                                                                    strokeDasharray="3 3"
                                                                    strokeWidth={2}
                                                                    isFront={true}
                                                                    label={{
                                                                        value: '',
                                                                        position: 'top',
                                                                        fill: '#2563eb',
                                                                        fontSize: 12
                                                                    }}
                                                                />
                                                                <ReferenceLine
                                                                    x={dateRange.end}
                                                                    stroke="#2563eb"
                                                                    strokeDasharray="3 3"
                                                                    strokeWidth={2}
                                                                    isFront={true}
                                                                    label={{
                                                                        value: '',
                                                                        position: 'top',
                                                                        fill: '#2563eb',
                                                                        fontSize: 12
                                                                    }}
                                                                />
                                                            </>
                                                        )}

                                                        {/* Selection overlay */}
                                                        {selecting && dateRange.start && dateRange.end && (
                                                            <ReferenceArea
                                                                x1={dateRange.start}
                                                                x2={dateRange.end}
                                                                fill="#2563eb"
                                                                fillOpacity={0.1}
                                                                strokeOpacity={0}
                                                            />
                                                        )}

                                                        <Tooltip content={<CustomTooltip selectedMonth={selectedMonth} />} />
                                                    </AreaChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>

                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                                            <div>
                                                Histórico de Vendas
                                                {selectedMonth && (
                                                    <span className="ml-2 text-sm font-normal text-muted-foreground">
                                                        Filtrado por: {selectedMonth}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                                    disabled={currentPage === 1}
                                                >
                                                    <ChevronLeft className="h-4 w-4" />
                                                </Button>
                                                <span className="text-sm">
                                                    Página {currentPage} de {totalPages}
                                                </span>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                                    disabled={currentPage === totalPages}
                                                >
                                                    <ChevronRight className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="overflow-x-auto -mx-6 px-6">
                                            <div className="min-w-[900px]">
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead
                                                                sortable
                                                                sortDirection={sortConfig.column === 'dtemissao' ? sortConfig.direction : null}
                                                                onSort={() => handleSort('dtemissao')}
                                                            >
                                                                Data
                                                            </TableHead>
                                                            <TableHead
                                                                sortable
                                                                sortDirection={sortConfig.column === 'cdpedido' ? sortConfig.direction : null}
                                                                onSort={() => handleSort('cdpedido')}
                                                            >
                                                                Pedido
                                                            </TableHead>
                                                            <TableHead
                                                                sortable
                                                                sortDirection={sortConfig.column === 'nrdocumento' ? sortConfig.direction : null}
                                                                onSort={() => handleSort('nrdocumento')}
                                                            >
                                                                Documento
                                                            </TableHead>
                                                            <TableHead
                                                                sortable
                                                                sortDirection={sortConfig.column === 'nmpessoa' ? sortConfig.direction : null}
                                                                onSort={() => handleSort('nmpessoa')}
                                                            >
                                                                Cliente
                                                            </TableHead>
                                                            <TableHead
                                                                sortable
                                                                sortDirection={sortConfig.column === 'tppessoa' ? sortConfig.direction : null}
                                                                onSort={() => handleSort('tppessoa')}
                                                            >
                                                                Tipo
                                                            </TableHead>
                                                            <TableHead
                                                                sortable
                                                                sortDirection={sortConfig.column === 'nmempresacurtovenda' ? sortConfig.direction : null}
                                                                onSort={() => handleSort('nmempresacurtovenda')}
                                                            >
                                                                Filial
                                                            </TableHead>
                                                            <TableHead
                                                                sortable
                                                                sortDirection={sortConfig.column === 'qtbrutaproduto' ? sortConfig.direction : null}
                                                                onSort={() => handleSort('qtbrutaproduto')}
                                                                className="text-right"
                                                            >
                                                                Qtd
                                                            </TableHead>
                                                            <TableHead
                                                                sortable
                                                                sortDirection={sortConfig.column === 'vlfaturamento' ? sortConfig.direction : null}
                                                                onSort={() => handleSort('vlfaturamento')}
                                                                className="text-right"
                                                            >
                                                                Faturamento
                                                            </TableHead>
                                                            <TableHead
                                                                sortable
                                                                sortDirection={sortConfig.column === 'vltotalcustoproduto' ? sortConfig.direction : null}
                                                                onSort={() => handleSort('vltotalcustoproduto')}
                                                                className="text-right"
                                                            >
                                                                Custo
                                                            </TableHead>
                                                            <TableHead
                                                                sortable
                                                                sortDirection={sortConfig.column === 'margem' ? sortConfig.direction : null}
                                                                onSort={() => handleSort('margem')}
                                                                className="text-right"
                                                            >
                                                                Margem
                                                            </TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody className={cn(roboto.className, "text-xs sm:text-sm")}>
                                                        {filteredData
                                                            .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                                                            .map((item, index) => (
                                                                <TableRow key={index}>
                                                                    <TableCell>{item.dtemissao}</TableCell>
                                                                    <TableCell>
                                                                        <Link
                                                                            href={`/vendas-dia/${item.cdpedido}?nrdocumento=${item.nrdocumento}&dtemissao=${item.dtemissao}&fromProduct=${item.cdproduto}`}
                                                                            className="text-blue-500 hover:text-blue-700 underline"
                                                                        >
                                                                            {item.cdpedido}
                                                                        </Link>
                                                                    </TableCell>
                                                                    <TableCell>{item.nrdocumento}</TableCell>
                                                                    <TableCell>
                                                                        <Link
                                                                            href={`/cliente/${encodeURIComponent(item.nmpessoa)}?returnUrl=${encodeURIComponent(window.location.pathname + window.location.search)}`}
                                                                            className="text-blue-500 hover:text-blue-700 underline"
                                                                        >
                                                                            {item.nmpessoa}
                                                                        </Link>
                                                                    </TableCell>
                                                                    <TableCell>{item.tppessoa}</TableCell>
                                                                    <TableCell>{item.nmempresacurtovenda}</TableCell>
                                                                    <TableCell className="text-right">{item.qtbrutaproduto}</TableCell>
                                                                    <TableCell className="text-right">
                                                                        {item.vlfaturamento.toLocaleString('pt-BR', {
                                                                            style: 'currency',
                                                                            currency: 'BRL'
                                                                        })}
                                                                    </TableCell>
                                                                    <TableCell className="text-right">
                                                                        {item.vltotalcustoproduto.toLocaleString('pt-BR', {
                                                                            style: 'currency',
                                                                            currency: 'BRL'
                                                                        })}
                                                                    </TableCell>
                                                                    <TableCell className="text-right">{item.margem}</TableCell>
                                                                </TableRow>
                                                            ))}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </>
                        ) : (
                            <Card>
                                <CardContent className="p-6">
                                    <div className="flex flex-col items-center justify-center text-center space-y-2">
                                        <Package className="h-12 w-12 text-muted-foreground" />
                                        <p className="text-lg font-medium text-muted-foreground">
                                            Este produto ainda não possui vendas registradas
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Always show stock card if stock data exists */}
                        {data.stock && data.stock[0] && (
                            <ProductStockCard stockData={data.stock[0]} />
                        )}
                    </>
                )}
            </div>
        </PermissionGuard>
    )
}

// Main component with Suspense boundary
export default function ProductSalesDetails() {
    return (
        <Suspense fallback={<ProductLoading />}>
            <ProductSalesDetailsContent />
        </Suspense>
    )
} 