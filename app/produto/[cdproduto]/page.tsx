'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Package, ChevronLeft, ChevronRight } from 'lucide-react'
import Loading from '../../vendas-dia/loading'
import { cn } from "@/lib/utils"
import { useSpring, animated } from '@react-spring/web'
import './styles.css'

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
    qtbrutaproduto: number
    dtemissao: string
    nmempresacurtovenda: string
}

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
            setFilteredData(data.filter(item => item.nmempresacurtovenda === selectedFilial))
        } else {
            setFilteredData(data)
        }
        setCurrentPage(1) // Reset para primeira página ao filtrar
    }, [selectedFilial, data])

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
                faturamento: 0
            }
        }
        acc[filial].quantidade += item.qtbrutaproduto
        acc[filial].faturamento += item.vlfaturamento
        return acc
    }, {} as Record<string, { quantidade: number, faturamento: number }>)

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
        <div className="space-y-6">
            <Button
                variant="ghost"
                onClick={() => router.back()}
                className="mb-4"
            >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar
            </Button>

            <div className="grid gap-2 grid-cols-3">
                <Card className="h-full">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 p-2">
                        <CardTitle className="text-xs sm:text-sm font-medium">
                            Código do Produto
                        </CardTitle>
                        <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent className="p-2 sm:p-6">
                        <div className="text-sm sm:text-2xl font-bold truncate">{data[0].cdproduto}</div>
                    </CardContent>
                </Card>
                <Card className="h-full">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 p-2">
                        <CardTitle className="text-xs sm:text-sm font-medium">
                            Descrição
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-2 sm:p-6">
                        <div className="text-sm sm:text-2xl font-bold break-words">
                            {data[0].nmproduto}
                        </div>
                    </CardContent>
                </Card>
                <Card className="h-full">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 p-2">
                        <CardTitle className="text-xs sm:text-sm font-medium">
                            Total Vendido
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-2 sm:p-6">
                        <div className="text-sm sm:text-2xl font-bold">
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
                                <TableHead className="text-right">% do Total</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sortedFilials.map(([filial, values]) => {
                                const percentage = (values.quantidade / totals.quantidade) * 100
                                return (
                                    <TableRow 
                                        key={filial}
                                        className={cn(
                                            "relative cursor-pointer hover:bg-accent/50",
                                            selectedFilial === filial && "bg-accent"
                                        )}
                                        onClick={() => setSelectedFilial(filial === selectedFilial ? null : filial)}
                                    >
                                        <TableCell className="font-medium">{filial}</TableCell>
                                        <TableCell className="text-right">
                                            <AnimatedValue value={values.quantidade} suffix=" un" />
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <AnimatedValue 
                                                value={values.faturamento}
                                                formatter={(value) => value.toLocaleString('pt-BR', {
                                                    style: 'currency',
                                                    currency: 'BRL'
                                                })}
                                            />
                                        </TableCell>
                                        <TableCell className="text-right">
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
                            <TableRow className="font-bold">
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
                        <TableBody>
                            {currentItems.map((item, index) => (
                                <TableRow key={index}>
                                    <TableCell>{item.dtemissao}</TableCell>
                                    <TableCell>{item.cdpedido}</TableCell>
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