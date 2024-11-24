'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams, useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { ArrowLeft, TrendingUp, TrendingDown, AlertTriangle, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react'
import { SaleDetail } from '@/types/sales'
import Loading from '../loading'
import { cn } from "@/lib/utils"

export default function SaleDetails() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const params = useParams()
    const [data, setData] = useState<SaleDetail[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
        key: '',
        direction: 'asc'
    })

    useEffect(() => {
        const fetchData = async () => {
            try {
                const nrdocumento = searchParams.get('nrdocumento')
                const cdpedido = params?.cdpedido as string
                
                if (!nrdocumento || !cdpedido) {
                    throw new Error('Documento ou pedido não encontrado')
                }

                const response = await fetch(`/api/vendas-dia/${cdpedido}?nrdocumento=${nrdocumento}`)
                if (!response.ok) {
                    throw new Error('Failed to fetch sale details')
                }
                const saleData = await response.json()
                setData(saleData)
            } catch (error) {
                console.error('Error fetching sale details:', error)
                setError(error instanceof Error ? error.message : 'Failed to fetch sale details')
            } finally {
                setIsLoading(false)
            }
        }

        fetchData()
    }, [params, searchParams])

    const calculateMargin = (totalRevenue: number, totalCost: number) => {
        const margin = (totalRevenue - (totalRevenue * 0.268 + totalCost)) / totalRevenue * 100
        return margin
    }

    const getMarginStyle = (margin: number) => {
        if (margin > 3) {
            return {
                background: "linear-gradient(to right, hsl(142.1 76.2% 36.3%), hsl(143.8 71.8% 29.2%))",
                icon: <TrendingUp className="h-8 w-8 text-white" />,
                textColor: "text-white"
            }
        } else if (margin >= 0) {
            return {
                background: "linear-gradient(to right, hsl(47.9 95.8% 53.1%), hsl(46 96.2% 48.3%))",
                icon: <AlertTriangle className="h-8 w-8 text-white" />,
                textColor: "text-white"
            }
        } else {
            return {
                background: "linear-gradient(to right, hsl(0 72.2% 50.6%), hsl(0 72.2% 40.6%))",
                icon: <TrendingDown className="h-8 w-8 text-white" />,
                textColor: "text-white"
            }
        }
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
                            Nenhum detalhe encontrado para este pedido.
                        </p>
                    </CardContent>
                </Card>
            </div>
        )
    }

    const totals = data.reduce((acc, item) => ({
        faturamento: acc.faturamento + item.vlfaturamento,
        custo: acc.custo + item.vltotalcustoproduto,
        quantidade: acc.quantidade + item.qtbrutaproduto
    }), { faturamento: 0, custo: 0, quantidade: 0 })

    const marginPercentage = calculateMargin(totals.faturamento, totals.custo)
    const marginStyle = getMarginStyle(marginPercentage)

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

            <div className="grid gap-4 grid-cols-2 sm:grid-cols-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Pedido
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-500">{data[0].cdpedido}</div>
                        <div className="text-xs text-muted-foreground space-y-1">
                            <p>Documento: {data[0].nrdocumento}</p>
                            <p>Filial: {data[0].nmempresacurtovenda}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Cliente
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data[0].tppessoa}</div>
                        <p className="text-xs text-muted-foreground">
                            {data[0].nmpessoa}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Representante
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data[0].nmrepresentantevenda}</div>
                        <p className="text-xs text-muted-foreground">
                            {data[0].dsunidadedenegocio}
                        </p>
                    </CardContent>
                </Card>
                <Card className="relative overflow-hidden">
                    <div 
                        className="absolute inset-0 z-0"
                        style={{ background: marginStyle.background }}
                    />
                    <CardHeader className="relative z-10">
                        <CardTitle className={cn("text-sm font-medium", marginStyle.textColor)}>
                            Margem Final
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="relative z-10 flex justify-between items-center">
                        <div className="text-2xl font-bold text-white">
                            {marginPercentage.toFixed(2)}%
                        </div>
                        {marginStyle.icon}
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Itens do Pedido</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Código</TableHead>
                                <TableHead>Produto</TableHead>
                                <TableHead>Grupo</TableHead>
                                <TableHead 
                                    className="text-right cursor-pointer hover:bg-accent/50"
                                    onClick={() => {
                                        const newData = [...data].sort((a, b) => {
                                            if (sortConfig.key === 'qtd' && sortConfig.direction === 'asc') {
                                                return b.qtbrutaproduto - a.qtbrutaproduto
                                            }
                                            return a.qtbrutaproduto - b.qtbrutaproduto
                                        })
                                        setData(newData)
                                        setSortConfig({ key: 'qtd', direction: sortConfig.direction === 'asc' ? 'desc' : 'asc' })
                                    }}
                                >
                                    <div className="flex items-center justify-end gap-2">
                                        Qtd
                                        {sortConfig.key === 'qtd' ? (
                                            sortConfig.direction === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                                        ) : <ArrowUpDown className="h-4 w-4" />}
                                    </div>
                                </TableHead>
                                <TableHead 
                                    className="text-right cursor-pointer hover:bg-accent/50"
                                    onClick={() => {
                                        const newData = [...data].sort((a, b) => {
                                            const aValue = a.vlfaturamento / a.qtbrutaproduto
                                            const bValue = b.vlfaturamento / b.qtbrutaproduto
                                            if (sortConfig.key === 'unitValue' && sortConfig.direction === 'asc') {
                                                return bValue - aValue
                                            }
                                            return aValue - bValue
                                        })
                                        setData(newData)
                                        setSortConfig({ key: 'unitValue', direction: sortConfig.direction === 'asc' ? 'desc' : 'asc' })
                                    }}
                                >
                                    <div className="flex items-center justify-end gap-2">
                                        Valor Unit.
                                        {sortConfig.key === 'unitValue' ? (
                                            sortConfig.direction === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                                        ) : <ArrowUpDown className="h-4 w-4" />}
                                    </div>
                                </TableHead>
                                <TableHead 
                                    className="text-right cursor-pointer hover:bg-accent/50"
                                    onClick={() => {
                                        const newData = [...data].sort((a, b) => {
                                            if (sortConfig.key === 'total' && sortConfig.direction === 'asc') {
                                                return b.vlfaturamento - a.vlfaturamento
                                            }
                                            return a.vlfaturamento - b.vlfaturamento
                                        })
                                        setData(newData)
                                        setSortConfig({ key: 'total', direction: sortConfig.direction === 'asc' ? 'desc' : 'asc' })
                                    }}
                                >
                                    <div className="flex items-center justify-end gap-2">
                                        Total
                                        {sortConfig.key === 'total' ? (
                                            sortConfig.direction === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                                        ) : <ArrowUpDown className="h-4 w-4" />}
                                    </div>
                                </TableHead>
                                <TableHead 
                                    className="text-right cursor-pointer hover:bg-accent/50"
                                    onClick={() => {
                                        const newData = [...data].sort((a, b) => {
                                            if (sortConfig.key === 'cost' && sortConfig.direction === 'asc') {
                                                return b.vltotalcustoproduto - a.vltotalcustoproduto
                                            }
                                            return a.vltotalcustoproduto - b.vltotalcustoproduto
                                        })
                                        setData(newData)
                                        setSortConfig({ key: 'cost', direction: sortConfig.direction === 'asc' ? 'desc' : 'asc' })
                                    }}
                                >
                                    <div className="flex items-center justify-end gap-2">
                                        Custo
                                        {sortConfig.key === 'cost' ? (
                                            sortConfig.direction === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                                        ) : <ArrowUpDown className="h-4 w-4" />}
                                    </div>
                                </TableHead>
                                <TableHead 
                                    className="text-right cursor-pointer hover:bg-accent/50"
                                    onClick={() => {
                                        const newData = [...data].sort((a, b) => {
                                            const aMargin = parseFloat(a.margem)
                                            const bMargin = parseFloat(b.margem)
                                            if (sortConfig.key === 'margin' && sortConfig.direction === 'asc') {
                                                return bMargin - aMargin
                                            }
                                            return aMargin - bMargin
                                        })
                                        setData(newData)
                                        setSortConfig({ key: 'margin', direction: sortConfig.direction === 'asc' ? 'desc' : 'asc' })
                                    }}
                                >
                                    <div className="flex items-center justify-end gap-2">
                                        Margem
                                        {sortConfig.key === 'margin' ? (
                                            sortConfig.direction === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                                        ) : <ArrowUpDown className="h-4 w-4" />}
                                    </div>
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.map((item, index) => (
                                <TableRow key={index}>
                                    <TableCell>{item.cdproduto.trim()}</TableCell>
                                    <TableCell>{item.nmproduto}</TableCell>
                                    <TableCell>{item.nmgrupoproduto}</TableCell>
                                    <TableCell className="text-right">{item.qtbrutaproduto}</TableCell>
                                    <TableCell className="text-right">
                                        {(item.vlfaturamento / item.qtbrutaproduto).toLocaleString('pt-BR', {
                                            style: 'currency',
                                            currency: 'BRL'
                                        })}
                                    </TableCell>
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
                                    <TableCell className="text-right">
                                        {item.margem}
                                    </TableCell>
                                </TableRow>
                            ))}
                            <TableRow className="font-bold">
                                <TableCell colSpan={3}>Total</TableCell>
                                <TableCell className="text-right">{totals.quantidade}</TableCell>
                                <TableCell className="text-right">-</TableCell>
                                <TableCell className="text-right">
                                    {totals.faturamento.toLocaleString('pt-BR', {
                                        style: 'currency',
                                        currency: 'BRL'
                                    })}
                                </TableCell>
                                <TableCell className="text-right">
                                    {totals.custo.toLocaleString('pt-BR', {
                                        style: 'currency',
                                        currency: 'BRL'
                                    })}
                                </TableCell>
                                <TableCell className="text-right">
                                    {marginPercentage.toFixed(2)}%
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
} 