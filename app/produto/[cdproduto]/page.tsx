'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Package, ChevronLeft, ChevronRight, Check, AlertTriangle, XCircle, Search } from 'lucide-react'
import Loading from '../../vendas-dia/loading'
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
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

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

// Add this font configuration after the imports
const roboto = Roboto({
    weight: ['400', '500'],
    subsets: ['latin'],
    display: 'swap',
})

// Hook personalizado para animar números
function useCountUp(end: number, duration: number = 2000) {
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

// Add these functions at the top level after the existing helper functions
const STORAGE_KEY = 'products_cache'
const CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 hours in milliseconds

const getStoredProducts = () => {
    if (typeof window === 'undefined') return null;
    
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return null;

    try {
        const { data, timestamp } = JSON.parse(stored)
        // Check if cache is expired
        if (Date.now() - timestamp > CACHE_DURATION) {
            localStorage.removeItem(STORAGE_KEY)
            return null
        }
        return data
    } catch (error) {
        console.error('Error parsing stored products:', error)
        return null
    }
}

const storeProducts = (products: Product[]) => {
    if (typeof window === 'undefined') return;
    
    const dataToStore = {
        data: products,
        timestamp: Date.now()
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToStore))
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

const prepareMonthlyData = (data: ProductSale[]): MonthlyData[] => {
    const monthlyTotals = data.reduce((acc, sale) => {
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

export default function ProductSalesDetails() {
    const router = useRouter()
    const params = useParams()
    const searchParams = useSearchParams()
    const [data, setData] = useState<ProductSale[]>([])
    const [filteredData, setFilteredData] = useState<ProductSale[]>([])
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
    const monthlyData = useMemo(() => prepareMonthlyData(data), [data])

    useEffect(() => {
        const fetchData = async () => {
            const cdproduto = params?.cdproduto as string
            if (!cdproduto) {
                // No product selected yet - return early
                return
            }

            setIsLoading(true)
            try {
                const response = await fetch(`/api/produto/${cdproduto}`)
                
                if (!response.ok) {
                    throw new Error('Failed to fetch product sales')
                }
                const salesData = await response.json()
                setData(salesData)
            } catch (err) {
                const error = err as Error
                console.error('Error fetching product sales:', error)
                setError(error.message || 'Failed to fetch product sales')
            } finally {
                setIsLoading(false)
            }
        }

        fetchData()
    }, [params])

    useEffect(() => {
        let sorted = [...data] as SortableProductSale[]
        
        if (sortConfig.direction) {
            sorted.sort((a, b) => {
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

                const compareA = String(a[sortConfig.column]).toLowerCase()
                const compareB = String(b[sortConfig.column]).toLowerCase()

                return sortConfig.direction === 'asc'
                    ? compareA.localeCompare(compareB)
                    : compareB.localeCompare(compareA)
            })
        }

        if (selectedFilial) {
            sorted = sorted.filter(item => item.nmempresacurtovenda === selectedFilial)
        }

        setFilteredData(sorted)
        setCurrentPage(1)
    }, [selectedFilial, data, sortConfig])

    useEffect(() => {
        // Set initial product code when data is loaded
        if (data.length > 0) {
            setInputProductCode(data[0].cdproduto)
        }
    }, [data])

    useEffect(() => {
        const fetchAndStoreProducts = async () => {
            // Try to get from localStorage first
            const storedProducts = getStoredProducts()
            if (storedProducts) {
                setAllProducts(storedProducts)
                return
            }

            try {
                const response = await fetch('/api/produtos')
                if (!response.ok) throw new Error('Failed to fetch products')
                const data = await response.json()
                setAllProducts(data)
                storeProducts(data)
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
        setInputProductCode(data[0]?.cdproduto || '')
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
            const newConfig = {
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

    if (!data.length && !isLoading) {
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

    if (isLoading) return <Loading />

    if (!data.length) {
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

    const totals = data.reduce((acc, item) => ({
        faturamento: acc.faturamento + item.vlfaturamento,
        quantidade: acc.quantidade + item.qtbrutaproduto
    }), { faturamento: 0, quantidade: 0 })

    const filialTotals = data.reduce((acc, item) => {
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

    // Função para calcular margem
    const calculateMargin = (faturamento: number, custo: number) => {
        return ((faturamento - (faturamento * 0.268 + custo)) / faturamento) * 100
    }

    // Ordenar filiais por quantidade
    const sortedFilials = Object.entries(filialTotals)
        .sort(([, a], [, b]) => b.quantidade - a.quantidade)

    // Encontrar a maior quantidade para calcular as proporções
    const maxQuantity = Math.max(...Object.values(filialTotals).map(v => v.quantidade))

    // Paginação
    const totalPages = Math.ceil(filteredData.length / itemsPerPage)
    const currentItems = filteredData.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    )

    return (
        <div className="space-y-2">
            <Button
                variant="ghost"
                onClick={handleBack}
                className="mb-0 w-full justify-end"
            >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar
            </Button>

            <h1 className="text-3xl font-bold tracking-tight flex justify-center">Detalhe do Produto</h1>

            <div className="grid gap-2 grid-cols-3">
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
                                {data[0]?.cdproduto}
                            </div>
                        )}
                    </CardContent>
                </Card>
                {isMobile ? (
                    <Card 
                        className="h-full cursor-pointer hover:ring-2 hover:ring-primary/50"
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
                                {data[0].nmproduto}
                            </div>
                            <div className="text-xs text-muted-foreground mt-2">
                                Grupo: {data[0].nmgrupoproduto}
                                <br />
                                {data[0].nmfornecedorprincipal}
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
                ) : (
                    <Popover open={isSearchOpen} onOpenChange={setIsSearchOpen}>
                        <PopoverTrigger asChild>
                            <Card 
                                className="h-full cursor-pointer hover:ring-2 hover:ring-primary/50"
                            >
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 p-2">
                                    <CardTitle className="text-xs sm:text-sm font-medium">
                                        Descrição
                                    </CardTitle>
                                    <Search className="h-4 w-4" />
                                </CardHeader>
                                <CardContent className="p-2 md:p-4">
                                    <div className="text-sm md:text-xl font-bold break-words">
                                        {data[0].nmproduto}
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-2">
                                        Grupo: {data[0].nmgrupoproduto}
                                        <br />
                                        {data[0].nmfornecedorprincipal}
                                    </div>
                                </CardContent>
                            </Card>
                        </PopoverTrigger>
                        <PopoverContent className="p-0 w-[400px]" align="end">
                            <SearchContent
                                searchQuery={searchQuery}
                                setSearchQuery={setSearchQuery}
                                filteredProducts={filteredProducts}
                                handleProductSelect={handleProductSelect}
                            />
                        </PopoverContent>
                    </Popover>
                )}
                <Card className="h-full">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 p-2">
                        <CardTitle className="text-xs sm:text-sm font-medium">
                            Total Vendido
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
            </div>

            <div className={cn(
                "grid gap-2",
                isMobile ? "grid-cols-1" : "grid-cols-2"
            )}>
                <Card className={cn(
                    isMobile && "col-span-1"
                )}>
                    <CardHeader>
                        <CardTitle className="text-sm font-medium flex justify-between items-center">
                            <span>Vendas por Filial</span>
                            {selectedFilial && (
                                <Button 
                                    variant="ghost" 
                                    size="xs"
                                    onClick={() => setSelectedFilial(null)}
                                >
                                    Limpar Filtro
                                </Button>
                            )}
                        </CardTitle>
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
                                            {calculateMargin(totals.faturamento, data.reduce((acc, item) => acc + item.vltotalcustoproduto, 0)) >= 0 ? (
                                                <div className="flex justify-end">
                                                    <div className={cn(
                                                        "inline-flex items-center gap-1 rounded-full px-2 py-1",
                                                        getMarginStyle(calculateMargin(totals.faturamento, data.reduce((acc, item) => acc + item.vltotalcustoproduto, 0))).background,
                                                        getMarginStyle(calculateMargin(totals.faturamento, data.reduce((acc, item) => acc + item.vltotalcustoproduto, 0))).text
                                                    )}>
                                                        <AnimatedValue 
                                                            value={calculateMargin(totals.faturamento, data.reduce((acc, item) => acc + item.vltotalcustoproduto, 0))}
                                                            formatter={(value) => value.toFixed(2)}
                                                            suffix="%"
                                                        />
                                                        {getMarginStyle(calculateMargin(totals.faturamento, data.reduce((acc, item) => acc + item.vltotalcustoproduto, 0))).icon}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex justify-end">
                                                    <div className={cn(
                                                        "inline-flex items-center gap-1 rounded-full px-2 py-1",
                                                        getMarginStyle(calculateMargin(totals.faturamento, data.reduce((acc, item) => acc + item.vltotalcustoproduto, 0))).background,
                                                        getMarginStyle(calculateMargin(totals.faturamento, data.reduce((acc, item) => acc + item.vltotalcustoproduto, 0))).text
                                                    )}>
                                                        {getMarginStyle(calculateMargin(totals.faturamento, data.reduce((acc, item) => acc + item.vltotalcustoproduto, 0))).icon}
                                                        <AnimatedValue 
                                                            value={calculateMargin(totals.faturamento, data.reduce((acc, item) => acc + item.vltotalcustoproduto, 0))}
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
                        <CardTitle className="text-sm font-medium">
                            Tendência de Vendas
                        </CardTitle>
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
                                >
                                    <defs>
                                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
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
                                            }).format(value)
                                        }
                                    />
                                    <Tooltip 
                                        formatter={(value: number) => 
                                            new Intl.NumberFormat('pt-BR').format(value)
                                        }
                                        labelFormatter={(label) => `Mês: ${label}`}
                                        contentStyle={{
                                            backgroundColor: 'var(--background)',
                                            border: '1px solid var(--border)',
                                            borderRadius: '6px',
                                        }}
                                        labelStyle={{
                                            color: 'var(--foreground)',
                                        }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="quantity"
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
                    <CardTitle className="flex justify-between items-center">
                        <span>Histórico de Vendas</span>
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
                            {currentItems.map((item, index) => (
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
                </CardContent>
            </Card>
        </div>
    )
} 