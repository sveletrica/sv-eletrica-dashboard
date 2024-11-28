'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
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
}

interface Product {
    cdproduto: string
    nmproduto: string
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
            background: "bg-green-100",
            icon: <Check className="h-4 w-4 text-green-600" />,
            text: "text-green-600"
        }
    } else if (margin >= 0) {
        return {
            background: "bg-yellow-100",
            icon: <AlertTriangle className="h-4 w-4 text-yellow-600" />,
            text: "text-yellow-600"
        }
    } else {
        return {
            background: "bg-red-100",
            icon: <XCircle className="h-4 w-4 text-red-600" />,
            text: "text-red-600"
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

export default function ProductSalesDetails() {
    const router = useRouter()
    const params = useParams()
    const [data, setData] = useState<ProductSale[]>([])
    const [filteredData, setFilteredData] = useState<ProductSale[]>([])
    const [isLoading, setIsLoading] = useState(true)
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

    useEffect(() => {
        const fetchData = async () => {
            try {
                const cdproduto = params?.cdproduto as string
                if (!cdproduto) {
                    throw new Error('Código do produto não encontrado')
                }

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
        if (selectedFilial) {
            setFilteredData(data
                .filter(item => item.nmempresacurtovenda === selectedFilial)
                .sort((a, b) => {
                    // Split the date string into day, month, year
                    const [dayA, monthA, yearA] = a.dtemissao.split('/').map(Number);
                    const [dayB, monthB, yearB] = b.dtemissao.split('/').map(Number);
                    
                    // Create date objects (month - 1 because JavaScript months are 0-based)
                    const dateA = new Date(yearA, monthA - 1, dayA);
                    const dateB = new Date(yearB, monthB - 1, dayB);
                    
                    return dateB.getTime() - dateA.getTime();
                })
            )
        } else {
            setFilteredData(data
                .sort((a, b) => {
                    const [dayA, monthA, yearA] = a.dtemissao.split('/').map(Number);
                    const [dayB, monthB, yearB] = b.dtemissao.split('/').map(Number);
                    
                    const dateA = new Date(yearA, monthA - 1, dayA);
                    const dateB = new Date(yearB, monthB - 1, dayB);
                    
                    return dateB.getTime() - dateA.getTime();
                })
            )
        }
        setCurrentPage(1) // Reset para primeira página ao filtrar
    }, [selectedFilial, data])

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

    if (isLoading) return <Loading />

    if (!data.length) {
        return (
            <div className="space-y-6">
                <Button
                    variant="ghost"
                    onClick={() => router.back()}
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
                onClick={() => router.back()}
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

            <Card>
                <CardHeader>
                    <CardTitle className="text-sm font-medium flex justify-between items-center">
                        <span>Vendas por Filial</span>
                        {selectedFilial && (
                            <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => setSelectedFilial(null)}
                            >
                                Limpar Filtro
                            </Button>
                        )}
                    </CardTitle>
                </CardHeader>
                <CardContent>
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
                                            "relative cursor-pointer hover:bg-accent/50",
                                            selectedFilial === filial && "bg-accent",
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
                                                <div className="inline-flex">
                                                    <div className={cn(
                                                        "flex items-center justify-end gap-1 rounded-full px-2 py-1 min-w-[90px]",
                                                        getMarginStyle(margin).background
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
                                                <div className="inline-flex">
                                                    <div className={cn(
                                                        "flex items-center justify-end gap-1 rounded-full px-2 py-1 min-w-[90px]",
                                                        getMarginStyle(margin).background
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
                                        <div className="inline-flex">
                                            <div className={cn(
                                                "flex items-center justify-end gap-1 rounded-full px-2 py-1 min-w-[90px]",
                                                getMarginStyle(calculateMargin(totals.faturamento, data.reduce((acc, item) => acc + item.vltotalcustoproduto, 0))).background
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
                                        <div className="inline-flex">
                                            <div className={cn(
                                                "flex items-center justify-end gap-1 rounded-full px-2 py-1 min-w-[90px]",
                                                getMarginStyle(calculateMargin(totals.faturamento, data.reduce((acc, item) => acc + item.vltotalcustoproduto, 0))).background
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
                </CardContent>
            </Card>

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
                                <TableHead>Data</TableHead>
                                <TableHead>Pedido</TableHead>
                                <TableHead>Documento</TableHead>
                                <TableHead>Cliente</TableHead>
                                <TableHead>Tipo</TableHead>
                                <TableHead>Filial</TableHead>
                                <TableHead className="text-right">Qtd</TableHead>
                                <TableHead className="text-right">Faturamento</TableHead>
                                <TableHead className="text-right">Custo</TableHead>
                                <TableHead className="text-right">Margem</TableHead>
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
                                    <TableCell>{item.nmpessoa}</TableCell>
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